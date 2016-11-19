/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//2015.06

var dir = 0;
var commandStat;
var controllerStat;
var droidroneStat;
var serverStat;
var canvasStat;

//データ文字列表示など初期化
function initialize() {
    commandStat = document.getElementById("commandStat");
    controllerStat = document.getElementById("controllerStat");
    droidroneStat = document.getElementById("droidroneStat");
    serverStat = document.getElementById("serverStat");
    canvasStat = document.getElementById("canvasStat");

    dirInit();
    //setInterval(rDraw(), 5000);  rDraw()だと動かない。
    setInterval(rDraw, 5000);
}

//DOM読み込み完了　初期化
google.maps.event.addDomListener(window, 'load', initialize);

var google;
var pos;
var map;
//ローバー軌跡線

var imgFile;
var lastImgFile;
var lastNo = 0;
var sLastNo = 0;
var rPoly;
var sPoly;

//地図、画像クリア
function clearMap() {
    imgFile = 'imgFile';
    lastImgFile = 'lastImgFile';
    lastNo = 0;
    //画像クリア
     var canvas = document.getElementById('c2');
     var ctx = canvas.getContext('2d');
     ctx.clearRect(0, 0, 640, 360);
     canvas = document.getElementById('c1');
     ctx = canvas.getContext('2d');
     ctx.clearRect(0, 0, 640, 360);
     canvasStat.innerHTML = '画像クリア';
     rPoly = new google.maps.Polyline({
	strokeColor: '#0000FF',
	strokeOpacity: 1.0,
	strokeWeight: 3
    });
    //コース設定軌跡線
    sPoly = new google.maps.Polyline({
       strokeColor: '#000000',
       strokeOpacity: 1.0,
       strokeWeight: 3
    });
    rDraw();
}

//データディレクトリ検索、最新データディレクトリに
function dirInit() {
    //データ ディレクトリ読み込み。　 location.pathnameはやはり使えない。
    //(1)select要素からすべてのoption要素を削除する。
    document.forms.form1.dir.options.length = 0;

    var dReq = new XMLHttpRequest();
    //非同期通信　コールバック関数
    dReq.onreadystatechange = function () {
	if (dReq.readyState === 4) {
            if (dReq.status === 200) {
                var select = document.getElementById('dir');
                //Select Option追加　http://isthmis.me/Blog/javascript-selectbox/
                var dirList = [];
		dirList = dReq.responseText.split(',');
                dirList.sort().reverse();
                //serverStat.innerHTML = dirList.join('/');
                dir = dirList[0];
                var d = new Date(Number(dir));
                controllerStat.innerHTML = '表示データ開始時間' + d.toLocaleString();
                //最新データーを表示する為のディレクトリ指定
		for ( var i = 0;  i < dirList.length; i++ ) {
                    var option = document.createElement('option');
                    option.setAttribute('value', dirList[i]);
                    //javascript本　P103 明示的数値変換　本 P126
                    var d = new Date(Number(dirList[i]));
                    option.innerHTML = i + ': ' + d.toLocaleString();
                    select.appendChild(option);
 		}
                serverStat.innerHTML = '保存データディレクトリ数: ' + dirList.length;
                clearMap();
 	    } else {
		serverStat.innerHTML = "ディレクトリ一覧データ待ち";
	    }
	} else {
	    serverStat.innerHTML = "通信中";
	}
    };
    //サーバーとの非同期通信
    //CGI経由でデータディレクトリ読み取り　2015.6.15
    dReq.open('GET', 'droidrone.cgi?act=DIRLIST', true);
    dReq.send(null);
}

var rInfowindow = new google.maps.InfoWindow();;

//https://developers.google.com/maps/documentation/javascript/reference#Circle
var rAccCircle = new google.maps.Circle({
    fillColor: '#ff0000',   // 塗りつぶし色
    fillOpacity: 0.2,       // 塗りつぶし透過度（0: 透明 ⇔ 1:不透明）
    strokeColor: '#ff0000', // 外周色
    strokeOpacity: 0.5,       // 外周透過度（0: 透明 ⇔ 1:不透明）
    strokeWeight: 1         // 外周太さ（ピクセル）
});
// 距離、方向計算のコンストラクタ
var spherical = google.maps.geometry.spherical;
// ElevationServiceのコンストラクタ
var elevation = new google.maps.ElevationService();

//ローバー(ドロイドローン)アイコン表示
function rDraw() {
    //JSON読み込み　 location.pathname
    var jReq = new XMLHttpRequest();
    //非同期通信　コールバック関数
    jReq.onreadystatechange = function () {
        if (jReq.readyState === 4) {
            if ( jReq.status === 200 ) { // (req.responseText !== '[]') { return; }
                var rPath = rPoly.getPath();
		//jArray; time、　座標、、　向き、　速度、　GPS精度、　スタートからの距離、経過時間
 		var jArray = eval('(' + jReq.responseText + ')');
                //droidroneStat.innerHTML = 'データディレクトリ:' + dir + "/JSON 要素数:" + jArray.length;
                var jData;
                var infoWinMsg;
		var rAcc;
		var time;
                //Chromeデベロッパー・ツールの機能 http://www.buildinsider.net/web/chromedevtools/01#page-9
                //console.debug('Debug!! lastNo: ' + lastNo);
		
		//位置データのNoが同一(GPS更新なし)であればマーカーは追加しない
		var lastMarker = 0;
		//同一NoのimgFileのArray化(同一場所の画像を表示）
		var imgArray = [];
		var lastImgNo = 0;
		//jArray　一つ多くまわして、最終回で追加する
                for ( var i = lastNo; i < jArray.length + 1; i++ ) {
                    jData = jArray[i];
		    //Noが同一(GPS更新なし)であればimgFileの複数化
		    imgFile = 'data/' + dir + '/' + jData.time + '.jpg';
		    imgArray.push(imgFile);
		    
		    // 位置データのNoが同一(GPS更新なし)であればマーカーは追加しない、最終回は追加
		    if ( jData.no !== lastMarker || i === jArray.length ) {
			//GPSスタートの初期化
			if ( lastMarker === 0 ){
			    pos = new google.maps.LatLng(jData.lat, jData.lng);
			    //最終データで地図作製
			    setMap( jArray[jArray.length - 1] );
			    //設定を描画
			    sDraw();
			}
			lastMarker = jData.no;
			//jData.noの変化の最後を採用
			jData = jArray[i-1];
			rPos = new google.maps.LatLng(jData.lat, jData.lng);
			var rAcc = Math.round(jData.accuracy);
			// Because path is an MVCArray, we can simply append a new coordinate and it will automatically appear.
			rPath.push(rPos);
			//start地点からの方向と距離
			//https://developers.google.com/maps/documentation/javascript/reference?hl=ja#MVCArray
			//https://developers.google.com/maps/documentation/javascript/reference?hl=ja#spherical
			var head = spherical.computeHeading(pos, rPos);
			var dis = spherical.computeDistanceBetween(pos, rPos);
			var marker = new google.maps.Marker({
			    position: rPos,
			    icon: { path: 'M -2,2 0,-2 2,2 0,0 z', //arrowPath,
				scale: 3,
				strokeColor: '#00FF00',
				rotation: jData.rota 
				//var arrowPath = google.maps.SymbolPath.FORWARD_CLOSED_ARROW; 矢印中心を移動したかっのでPath作った。
			    }
			});
			marker.setMap(map);
			//imgArray の　リンク作製
			var imgAryLink = '';
			for(var j = lastImgNo ; j < i ; j++ ) {
			    imgAryLink += ' [ <a href="' + imgArray[j] + '" target="_blank">' + j + '</a> ] ';
			    lastImgNo++;
			}
			// infowindow内のコンテンツ(html)を作成 http://kwski.net/api/799/
			time = new Date(jData.time);
			canvasStat.innerHTML = '画像データ時間: ' + time.toLocaleString();
			
			infoWinMsg = '<div class="infowindow' + jData.no + '">'
			+ 'No.' + jData.no
			+ '<img src="'+ lastImgFile + '" width="100">' + imgAryLink
			//'<a href="' + imgFile + '" download="' + imgFile + '">ダウンロード</a>' +
			+ time.toLocaleString() + '<br />'
			+ ',高度:' + Math.round(jData.alti) + 'm'
			+ ',方向:' + Math.round(jData.rota)
			+ '°,pitch ' + Math.round(jData.pitch)
			+ '°,roll:' + Math.round(jData.roll)
			+ '°<br>誤差:' + rAcc +  'm,'
			+ '操縦者からの向き:' + Math.round(head) + '°,距離:' + Math.round(dis) + 'm'
			+ '</div>';
			//関数で呼ばないとInfowindowが重なる
			attachMessage(marker, infoWinMsg, LastImgFile);
			lastImgFile = imgFile;
		}
	    }
	    lastNo = jArray.length;
	    if ( document.forms.form1.MapSet.checked === true ) {
		map.setCenter(rPos);
	    }
	    rPoly.setMap(null);
	    rPoly.setMap(map);

	    //なぜかエラー
	    //droidroneStat.innerHTML = "No.: " + pos_no + ", 現在位置　lat:" + jData.lat + ", lag:" + jData.lng;
	    //rInfowindow.close();
	    //rInfowindow.setContent(infoWinMsg);
	    //rInfowindow.setPosition(rPos);
	    //rInfowindow.open(map);

	    rAccCircle.setMap(null);
	    //半径を指定した円を地図上の中心点に描く http://www.nanchatte.com/map/circle-v3.html
	    rAccCircle.setCenter(rPos);
	    // 中心点(google.maps.LatLng)
	    if (rAcc > 100) {rAcc = 100;}
	    rAccCircle.setRadius(rAcc);
	    rAccCircle.setMap(map);

	    /* Imageオブジェクトを生成 */
	    var img = new Image();
	    img.src = imgFile;
	    canvasStat.innerHTML = "c1読み込み" + imgFile;
	    /* 画像が読み込まれるのを待ってから処理を続行 */
	    img.onload = function () {
		//画像
		var canvas = document.getElementById('c1');
		var ctx = canvas.getContext('2d');
		//鏡像
		//ctx.translate(canvas.width, 0);
		//ctx.scale(-1, 1);
		ctx.drawImage(img, 0, 0, img.width, img.height);
		canvasStat.innerHTML = "c1描画" + lastImgFile;
	    };

            } else {
                serverStat.innerHTML = dir + "/ GPSデータ待ち";
            }
	} else {
            serverStat.innerHTML = 'データディレクトリ: ' + dir + " 通信中";
        }
    };
    //サーバーとの非同期通信
    //ファイルロックのCGI経由で読み取り変更 2015.6.10
    if (dir !== 0) {
        jReq.open('GET', 'droidrone.cgi?act=READ&dir=' + dir , true);
        jReq.send(null);
    }
}

//現在地の地図を表示
function setMap(lastData) {
    var lastPos = new google.maps.LatLng(lastData.lat, lastData.lng);
    var mapOptions = {
	 zoom: 18,
	 center: lastPos,
	 mapTypeId: google.maps.MapTypeId.ROADMAP,
	 //mapTypeId: google.maps.MapTypeId.TERRAIN
	 noClear : false //http://www.openspc2.org/Google/Maps/api3/Map_option/noClear/
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    // Add a listener for the click event
    google.maps.event.addListener(map, 'click', addLatLng);
    //
    //GoogleMap高度を調査。GPS高度と比べて見る
    //https://developers.google.com/maps/documentation/javascript/examples/elevation-simple
    //http://www.nanchatte.com/map/getElevationForLocation.html
    //GPS/地図の高度データが信用ならない理由 http://www.sc-runner.com/2013/07/why-gps-altitude-not-accurate.html
    //What vertical datum is used in Google Earth https://productforums.google.com/forum/#!topic/maps/FZkvHCNri0M　(海水面高度か？）
    // リクエストを発行  locations: 要素が１つでも配列に…。
    elevation.getElevationForLocations({ locations: [lastPos] }, function(results, status) {
	if (status === google.maps.ElevationStatus.OK) {
	  if (results[0].elevation) {
		// 標高ゲット！
		var gElev = results[0].elevation;
		droidroneStat.innerHTML = 'Google高度:' + Math.round(gElev) + 'm'
			+ ', GPS高度:' +  Math.round(lastData.alti) + 'm'
			+ ', GPS誤差:' +   Math.round(lastData.alti - gElev) + 'm';
	    }
	} else if (status === google.maps.ElevationStatus.INVALID_REQUEST) {
	    alert("リクエストに問題アリ！requestで渡している内容を確認せよ！！");
	} else if (status === google.maps.ElevationStatus.OVER_QUERY_LIMIT) {
	    alert("短時間にクエリを送りすぎ！落ち着いて！！");
	} else if (status === google.maps.ElevationStatus.REQUEST_DENIED) {
	    alert("このページでは ElevationResult の利用が許可されていない！・・・なぜ！？");
	} else if (status === google.maps.ElevationStatus.UNKNOWN_ERROR) {
	    alert("原因不明のなんらかのトラブルが発生した模様。");
	} else {
	    alert("えぇ～っと・・、バージョンアップ？");
	}
    });
}

//設定値のシンボル
var circlePath = google.maps.SymbolPath.CIRCLE;
var sLastInfowindow = new google.maps.InfoWindow();;

//設定経路描画
function sDraw() {
    //set.txt読み込み
    var sReq = new XMLHttpRequest();
    //非同期通信　コールバック関数
    sReq.onreadystatechange = function () {
        if (sReq.readyState === 4) {
            if ( sReq.status === 200 ) {
		var sPath = sPoly.getPath();
 		var sArray = sReq.responseText.split(/\r\n|\r|\n/);
                sArray.pop(); //最終行が空白のため要素を削除
                //console.debug('Debug!! 1 sArray.length: ' + sArray.length);
                var sPos;
                for ( var i = 0; i < sArray.length; i++ ) {
                    var sData = eval('(' + sArray[i] + ')');
                    //console.debug('Debug!! 2 sArray[i]: ' + i + "\n" + sArray[i]);
		    sPos = new google.maps.LatLng(sData.lat, sData.lng);
		    // Because path is an MVCArray, we can simply append a new coordinate and it will automatically appear.
		    sPath.push(sPos);
		    //start地点からの方向と距離
		    //https://developers.google.com/maps/documentation/javascript/reference?hl=ja#MVCArray
		    //https://developers.google.com/maps/documentation/javascript/reference?hl=ja#spherical
		    var head = spherical.computeHeading(pos, sPos);
		    var dis = spherical.computeDistanceBetween(pos, sPos);

		    var marker = new google.maps.Marker({
			position: sPos,
			icon: { path: circlePath, //arrowPath,
			    scale: 3,
			    strokeColor: '#FFFF00'
			}
		    });
		    marker.setMap(map);
                    // infowindo内のコンテンツ(html)を作成 http://kwski.net/api/799/
		    var sInfoWinMsg = 'No.' + sPath.length + '<br />'
		    +'高度: ' + Math.round(sData.alti) + 'm'
		    + ', ローバー方向: ' + sData.rota + '°,垂直角: ' +  sData.pitch + '°<br />'
		    + '操縦者からの向き: ' + Math.round(head) + '°,距離: ' + Math.round(dis) + 'm';
		    //関数で呼ばないとInfowindowが重なる
		    attachMessage(marker, sInfoWinMsg, '');
                }
                sLastInfowindow.setContent( '#' + sArray.length);
                sLastInfowindow.setPosition(sPos);
                sLastInfowindow.open(map);
                //console.debug('Debug!! 2 sArray.length: ' + sArray.length);
                //sPoly.setMap(null);
                sPoly.setMap(map);
	    }
	}
    };

    if (dir !== 0) {
        sReq.open('GET', 'data/' + dir + '/set.txt', true);
        sReq.send(null);
    }
}

//ローバーアイコンのWindow
function attachMessage(marker, msg, file) {
    //http://www.nanchatte.com/map/showDifferentInfoWindowOnEachMarker.html
    //google.maps.event.addListener(marker, 'click', function() {
    var infoWin = new google.maps.InfoWindow({
	    maxWidth: 300, // infowindowの最大幅を設定
	    content: msg
	});
    // mouseoverイベントを取得するListenerを追加
    google.maps.event.addListener(marker, 'mouseover', function(){
        infoWin.open(marker.getMap(), marker);
	if ( file !== '' ) {
	    /* Imageオブジェクトを生成 */
	    var img = new Image();
	    img.src = file;
	    canvasStat.innerHTML = "c2読み込み" + file;
	    /* 画像が読み込まれるのを待ってから処理を続行 */
	    img.onload = function () {
		//画像
		var canvas = document.getElementById('c2');
		var ctx = canvas.getContext('2d');
		//鏡像
		//ctx.translate(canvas.width, 0);
		//ctx.scale(-1, 1);
		ctx.drawImage(img, 0, 0, img.width, img.height);
		canvasStat.innerHTML = "c2描画";
	    };
	}
    });
    
    // mouseoutイベントを取得するListenerを追加
    google.maps.event.addListener(marker, 'mouseout', function(){
          infoWin.close();
    });
}

//JS本　P232　ID版　http://www.ipentec.com/document/document.aspx?page=javascript-get-selectbox-value
//データディレクトリ変更
 function chgDir() {
    //accCircle.setMap(null);
    //poly.setMap(null);
    //path = [];
    var s = document.forms.form1.dir;
    dir = s.options[s.selectedIndex].value;
    //dir = dirList[document.form1.select.selectedIndex];
    serverStat.innerHTML = '読み込みDir/' + dir;
    //初期設定
    clearMap();
}

//コース設定用文字列
var altiOption = '<option value="0">0m</option>\n\
<option value="10">10m</option>\n\
<option value="20">20m</option>\n\
<option value="30">30m</option>\n\
<option value="40">40m</option>';

var rotaOption = '<option value="0">北　0°</option>\n\
<option value="90">東　90°</option>\n\
<option value="180">南　180°</option>\n\
<option value="270">西　270°</option>\n\
<option value="360">全方向一周</option>';

var pitchOption = '<option value="0">正面　0°</option>\n\
<option value="45">斜め上　45°</option>\n\
<option value="-45">斜め下　-45°</option>';
//コース設定　Window描画
function addLatLng(event) {
    //http://www.ipentec.com/document/document.aspx?page=javascript-get-radiobutton-value
    if ( document.forms.form1.RadioSet.checked === true ) {
        //??
        //document.getElementById("Radio1").checked = true;
        //現在位置マップ中心を無効
        document.getElementById("MapSet").checked = false;
	var sPath = sPoly.getPath();
	// Because path is an MVCArray, we can simply append a new coordinate
	// and it will automatically appear.
	var sPos = event.latLng;
	sPath.push(sPos);
        sPoly.setMap(map);
	var num = sPath.getLength();
        var sInfowindow = new google.maps.InfoWindow();;
        sInfowindow.close();
        sInfowindow.setContent( '#' + num
            + '<form id="formSet" action="">'
            + '高度設定<select id="alti">' + altiOption + '</select><br />'
            + '方向設定<select id="rota">'+ rotaOption + '</select><br />'
            + 'カメラ上下<select id="pitch">'+ pitchOption + '</select>'
            + '</form>'
            + '<button id="dataSet">データ登録</button>'
         );
        sInfowindow.setPosition(sPos);
        sInfowindow.open(map);
        
        //infowindow close event/callback 設定位置変更
        google.maps.event.addListener(sInfowindow, 'closeclick', function () {
            sPath.pop();
            //設定継続
            document.getElementById("RadioSet").checked = true;
        });
        
        //addEventListener は、 1 つのイベントターゲットにイベントリスナーを 1 つ登録します。
        //https://developer.mozilla.org/ja/docs/Web/API/EventTarget/addEventListener
        document.getElementById("dataSet").addEventListener("click", function() {
            var fa = document.forms.formSet.alti;
            var fr = document.forms.formSet.rota;
            var fp = document.forms.formSet.pitch;
            var sJson = '{"no":' + num
                + ',"lat":' + sPos.lat()
                + ',"lng":' + sPos.lng()
                + ',"alti":' + fa.options[fa.selectedIndex].value
                + ',"rota":' + fr.options[fr.selectedIndex].value
                + ',"pitch":' + fp.options[fp.selectedIndex].value
                + "}\n";    //改行で配列にする
            sJson.innerHTML = sJson;
            //console.debug('Debug!! 2 setJSON: ' + "\n" + sJson);

            // XMLHttpRequest セットデータを作成
            var sjReq = new XMLHttpRequest();
            //非同期通信　コールバック関数
            sjReq.onreadystatechange = function () {
                if (sjReq.readyState === 4) {
                    if (sjReq.status === 200) {
                        var marker = new google.maps.Marker({
                            position: sPos,
                            icon: {path: circlePath, //arrowPath,
                                scale: 3,
                                strokeColor: '#FFFF00'
                            }
                        });
                        marker.setMap(map);
                        //設定Window削除
                        sInfowindow.close();
                        //最終設定位置表示
                        sLastInfowindow.close();
                        sLastInfowindow.setContent( '#' + num);
                        sLastInfowindow.setPosition(sPos);
                        sLastInfowindow.open(map);
                        //設定継続
                        document.getElementById("RadioSet").checked = true;
                    } else {
                        serverStat.innerHTML = dir + "/ セットデータ作製";
                    }
                } else {
                    serverStat.innerHTML = '/ セットデータ作製: ' + dir + " 通信中";
                }
            };
            //サーバーとの非同期通信
            //ファイルロックのCGI経由で読み取り変更 2015.6.10
            if (dir !== 0) {
                sjReq.open('GET', 'droidrone.cgi?act=SET&dir=' + dir + "&txt=" + encodeURIComponent(sJson), true);
                sjReq.send(null);
            }
        } , false);
    }
}

//操作コマンド送信
function command(command, str){ 
    var cReq = new XMLHttpRequest();
    //非同期通信　コールバック関数
    cReq.onreadystatechange = function () {
	if (cReq.readyState === 4) {
            if (cReq.status === 200) {
		var rStr = cReq.responseText;
		commandStat.innerHTML = "Send[" + command + "] : " + str + "; response:" + rStr;
 	    } else {
		commandStat.innerHTML = "ファイル更新待ち";
	    }
	} else {
	    commandStat.innerHTML = "通信中";
	}
    };
    //サーバーとの非同期通信
    //CGI経由でCommandデータ送信　2015.6.15
    cReq.open('GET', 'droidrone.cgi?act=COM&dir=' + dir + '&command=' + command, true);
    cReq.send(null);
}

//操縦者表示　未使用
function cDraw() {
    // Try HTML5 geolocation 位置情報を連続して取得する http://www6.ocn.ne.jp/~wot/web/html5/geoapi/wp.html 更新が早いので不採用
    //GPS 高度は 世界測地系 WGS 84 の基準となる回転楕円体の表面からの高さ。　実際とは違う。
    var acc;
    navigator.geolocation.getCurrentPosition( function (position) {
	var wgs84 = position.coords;
	pos = new google.maps.LatLng(wgs84.latitude, wgs84.longitude); //latitude 緯度（-180～180）度, longitude 経度（-90～90）度
	var alti = wgs84.altitude; //高度m
	var altiAcc = wgs84.altitudeAccuracy; //高度の誤差m
	acc = wgs84.accuracy; //accuracy 緯度・経度の誤差m
	var head = wgs84.heading; //方角（0～360）度
	var speed = wgs84.speed; //速度m/秒

    }, function () {
	handleNoGeolocation(true);
    });

    var marker = new google.maps.Marker({
        position: pos,
        icon: { path: circlePath, scale: 6 }
    });
    marker.setMap(map);

    attachMessage(marker, '操縦者の現在位置', 0);
    //半径を指定した円を地図上の中心点に描く http://www.nanchatte.com/map/circle-v3.html
    var accCircle1 = new google.maps.Circle({
        fillColor: '#00ff00',   // 塗りつぶし色
        fillOpacity: 0.2,       // 塗りつぶし透過度（0: 透明 ⇔ 1:不透明）
        strokeColor: '#00ff00', // 外周色
        strokeOpacity: 0.5,       // 外周透過度（0: 透明 ⇔ 1:不透明）
        strokeWeight: 1         // 外周太さ（ピクセル）
    });
    accCircle1.setCenter(pos);
    // 中心点(google.maps.LatLng)
    //if (acc > 100) { acc = 100; }
    accCircle1.setRadius(acc);
    accCircle1.setMap(map);
}
     //GeoJSONエディタ作ってみた。//http://shimz.me/blog/map/4225
    //path json 表示
    //var pathJson = document.getElementById("path-json");
    //pathJson.innerHTML = JSON.stringify(path);