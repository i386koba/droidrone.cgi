/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 * 2015/9/17 Jquery に対応
 */
//2015.06
var google;
var pos;
var map;
var cgi = 'droidrone.cgi?';
var imgfile;
var lastImgfile;
var lastNo = 0;
var sLastNo = 0;
var rPoly;
var sPoly;
var imgArray = [];
var imgNo = 0;
//
//2015.09　ビデオチャット＆テキストチャット作成チュートリアル！WebRTCを簡単＆柔軟に使える「SkyWay」を使ってみよう
//https://html5experts.jp/katsura/16331/
var localStream;    // 自分の映像ストリームを保存しておく変数
var peerdCall;  // 接続したコールを保存しておく変数
var peerdConn;  // 接続したコネを保存しておく変数
var destPeerId = '';//Android のPeerID

// カメラ／マイクにアクセスするためのメソッドを取得しておく
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// SkyWayのシグナリングサーバーへ接続する (APIキーを置き換える必要あり）
var peer = new Peer({key: '30fa6fbf-0cce-45c1-9ef6-2b6191881109', debug: 3});
var callID = '';

//メディアストリームPeer
var peerM = new Peer({key: '30fa6fbf-0cce-45c1-9ef6-2b6191881109', debug: 3});
var dir = 0;
   // 自分のIDを表示する
    peer.on('open', function () {
	// - 自分のIDはpeerオブジェクトのidプロパティに存在する
	$('#my-connid').text(peer.id);
	//MediaコネクトのPeer準備
    });

    peer.on('error', function (err) {
	console.log('conn-err:' + err);
	$("#call-id").text('call-err : ' + err);
    });

    peerM.on('open', function () {
	// - 自分のIDはpeerオブジェクトのidプロパティに存在する
	$('#my-callid').text(peerM.id);
	callID = peerM.id;
    });

//PeerM-err
    peerM.on('error', function (err) {
	console.log('peerM-err : ' + err);
	$('#call-id').text('peerM-err : ' + err);
	//console.debug('');
    });
//終了時
 $(window).on("beforeunload", function(){
   peer.destroy();
   peerM.destroy();
});

//データ文字列表示など初期化
function initialize() {
    dirInit();
    //setInterval(rDraw(), 5000);  rDraw()括弧がつくと動かない。
    //setInterval(rDraw, 5000);
}

//DOM読み込み完了　初期化
google.maps.event.addDomListener(window, 'load', initialize);

//データディレクトリ検索、最新データディレクトリに
function dirInit() {
    //(1)select要素からすべてのoption要素を削除する。https://www.softel.co.jp/blogs/tech/archives/4359 
    //全て取り除く
    $('#dir > option').remove();
    //Ajax Start
    $.ajax({
	url: cgi + 'act=DIRLIST',
	type: 'GET',
	dataType: 'text',
	cache: false,
	success: function (res) {
	    //Select Option追加　http://isthmis.me/Blog/javascript-selectbox/
	    var dirList = [];
	    dirList = res.split(',');
	    dirList.sort().reverse();
	    //serverStat.innerHTML = dirList.join('/');
	    dir = dirList[0];
	    var d = new Date(Number(dir));
	    $('#controllerStat').html('データ開始' + d.toLocaleString());
	    //最新データーを表示する為のディレクトリ指定
	    for (var i = 0; i < dirList.length; i++) {
		var d = new Date(Number(dirList[i]));
		$('#dir').append($('<option>').html(i + ': ' + d.toLocaleString()).val(dirList[i]));
	    }
	    $('#serverStat').html('ディレクトリ数: ' + dirList.length);
	    clearMap();
	},
	error: function () {
	    $('#serverStat').html('ディレクトリ取得失敗');
	}
    });
}

//地図、画像クリア
function clearMap() {
    //画像クリア
    var canvas = document.getElementById('c2');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 640, 360);
    canvas = document.getElementById('c1');
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 640, 360);

    imgfile = 'imgfile';
    lastImgfile = 'lastImgfile';
    lastNo = 0;
    imgArray = [];
    imgNo = 0;

    //コンソール初期化
    $('#canvasStat').html('画像選択待ち');
    $('#BTStat').html('未受信');
    $('#controllerStat').html('初期化');
    $('#droidroneStat').html('GPS未受信');
    $('#serverStat').html('初期化');

    rPoly = new google.maps.Polyline({
	strokeColor: '#0000FF',
	strokeOpacity: 1.0,
	strokeWeight: 3
    });
    //コース設定軌跡線
    sPoly = new google.maps.Polyline({
	strokeColor: '#000000',
	strokeOpacity: 1.0,
	sttrokeWeight: 3
    });
    rDraw();

 

    peerM.on('call', function (call) {
	// 切断時に利用するため、コールオブジェクトを保存しておく
	peerdCall = call;

	// 相手のIDを表示する
	// - 相手のIDはCallオブジェクトのpeerプロパティに存在する
	$("#call-id").text("Call from : " + call.peer);
	call.answer();

	call.on('stream', function (stream) {

	    // 映像ストリームオブジェクトをURLに変換する
	    // - video要素に表示できる形にするため変換している
	    var url = URL.createObjectURL(stream);

	    // video要素のsrcに設定することで、映像を表示する
	    $('#peer-video').prop('src', url);
	});
	call.on('error', function (err) {
	    console.log('call-err : ' + err);
	    $('#call-id').text('call-err : ' + err);
	    //console.debug('');
	});
    });
    //dir 内のpeer-id.txt読み取り
    $.ajax({
	url: 'data/' + dir + '/peer-id.txt',
	type: 'GET',
	dataType: 'text',
	cache: false,
	success: function (res) {
	    destPeerId = res;
	    $("#conn-id").text('data/' + dir + '/peer-id.txt : ' + destPeerId);
	    // 相手への接続を開始する
	    var conn = peer.connect(destPeerId);
	    //, { serialization: 'none', metadata: {message: 'hi i want to chat with you!'} });
	    peerdConn = conn;

	    // メッセージ受信イベントの設定

	    conn.on("data", function (data) {
		// 画面に受信したメッセージを表示
		$("#messages").append($("<p>").text(conn.id + ": " + data).css("font-weight", "bold"));
	    });
	    // 接続が完了した場合のイベントの設定
	    conn.on("open", function () {
		// Call-IDのメッセージを送信
		conn.send(callID);
		$("#conn-id").text('open to : ' + conn.id + ' /send callID : ' + callID);
	    });
	    //err
	    conn.on('error', function (err) {
		console.log('conn-err : ' + err);
		$("#conn-id").text('conn-err : ' + err);
	    });

	},
	error: function () {
	    $("#conn-id").text('data/' + dir + '/peer-id.txt読み取り失敗');
	}
    });
    //  マイクのストリームを取得する
    // - 取得が完了したら、第二引数のFunctionが呼ばれる。呼び出し時の引数は自身のストリーム
    // - 取得に失敗した場合、第三引数のFunctionが呼ばれる
    /*
     navigator.getUserMedia({audio: true, video: true}, function(lStream){
     // このストリームを通話がかかってき場合と、通話をかける場合に利用するため、保存しておく
     localStream = lStream;
     var lUrl = URL.createObjectURL(lStream);
     $('#my-video').prop('src', lUrl);
     //var call = peer.call(destPeerId, localStream);
     // 相手のストリームが渡された場合、このstreamイベントが呼ばれる
     // - 渡されるstreamオブジェクトは相手の映像についてのストリームオブジェクト
     call.on('stream', function(stream){
     
     // 映像ストリームオブジェクトをURLに変換する
     // - video要素に表示できる形にするため変換している
     var url = URL.createObjectURL(stream);
     
     // video要素のsrcに設定することで、映像を表示する
     $('#peer-video').prop('src', url);
     });
     //err
     call.on('error', function(err) {
     console.log('conn-err:' + err);
     $("#call-id").text('call-err : ' + err);
     });
     }, function(err) { 
     alert("getUserMedia Error!");
     $("#call-id").text('getUserMedia-err : ' + err.message);
     });
     */
    //複数のマーカーをまとめて地図上から削除する http://googlemaps.googlermania.com/google_maps_api_v3/ja/map_example_remove_all_markers.html
}

// commandボタンクリック時の動作
function command(command, str) {
    // 送信
    peerdConn.send(command);
    // 自分の画面に表示
    $("#commandStat").text('Send[' + command + '] : ' + str);
}

//Webカメラ有効にするかチェック
if ($('#webCameraOn').prop('checked')) {

}

function setCanvasImg(def) {
    imgNo += def;
    var str = "";
    if (imgNo < 0) {
	imgNo = 0;
	str = "最初の画像ファイル";
    }
    if (imgNo === imgArray.length) {
	imgNo = imgArray.length - 1;
	str = "最後の画像ファイル";
    }
    var fileTime = imgArray[imgNo];
    canvasDraw(fileTime, imgNo, str);
}
//保存画像表示
function canvasDraw(fileTime, no, str) {
    imgNo = no; //地図クリックの番号に対応
    var fileName = 'data/' + dir + '/' + fileTime + '.jpg';
    var time = new Date(fileTime); //time.toLocaleString()
    $('#canvasStat').html('撮影時間:' + time.toLocaleString()
	    + ' [<a href="' + fileName + '" download="' + time.toLocaleString() + '.jpg">ダウンロード</a>]'
	    + 'No.' + (no + 1) + " / " + imgArray.length + ". "
	    + str);
    /* Imageオブジェクトを生成 */
    var img = new Image();
    img.src = fileName;
    /* 画像が読み込まれるのを待ってから処理を続行 */
    img.onload = function () {
	var canvas = document.getElementById('c2');
	var ctx = canvas.getContext('2d');
	//鏡像
	//ctx.translate(canvas.width, 0);
	//ctx.scale(-1, 1);
	//縮小
	ctx.scale(0.5, 0.5);
	ctx.drawImage(img, 0, 0, img.width, img.height);
	ctx.scale(2, 2);
	//canvasStat.innerHTML += "c2描画" + fileName;
    };
}

var rInfowindow = new google.maps.InfoWindow();
;

//https://developers.google.com/maps/documentation/javascript/reference#Circle
var rAccCircle = new google.maps.Circle({
    fillColor: '#ff0000', // 塗りつぶし色
    fillOpacity: 0.2, // 塗りつぶし透過度（0: 透明 ⇔ 1:不透明）
    strokeColor: '#ff0000', // 外周色
    strokeOpacity: 0.5, // 外周透過度（0: 透明 ⇔ 1:不透明）
    strokeWeight: 1         // 外周太さ（ピクセル）
});
// 距離、方向計算のコンストラクタ
var spherical = google.maps.geometry.spherical;
// ElevationServiceのコンストラクタ
var elevation = new google.maps.ElevationService();

//ローバー(ドロイドローン)アイコン表示
var lastGpsNo = 0;
function rDraw() {
    $.ajax({
	url: cgi + 'act=READ&dir=' + dir,
	type: 'GET',
	dataType: 'text',
	cache: false,
	success: function (res) {
	    var rPath = rPoly.getPath();
	    var jArray = eval('(' + res + ')');
	    //droidroneStat.innerHTML = 'データディレクトリ:' + dir + "/JSON 要素数:" + jArray.length;
	    var jData;
	    var rPos = '';
	    var infoWinMsg;
	    var rAcc;
	    //位置移動なければ、複数画像を選択表示させる。
	    var infoImgArray = [];
	    //位置データ読み出し
	    for (var i = lastNo; i < jArray.length; i++) {
		jData = jArray[i];
		//BT受信 http://blog.tojiru.net/article/205007468.html
		if (jData.btr != null) {
		    BTStat.innerHTML = jData.btr;
		}
		imgfile = 'data/' + dir + '/' + jData.time + '.jpg';
		imgArray.push(jData.time);
		infoImgArray.push(jData.time);
		//GPS更新、最終回で更新
		if (jData.no !== lastGpsNo || i === jArray.length - 1) {
		    //GPSデータ最初の取得時、GPSデータがあればスタート地点描画
		    if (lastGpsNo === 0 && i !== jArray.length - 1) {
			//スタートデータ
			pos = new google.maps.LatLng(jData.lat, jData.lng);
			//最終データで地図作製
			setMap(jArray[jArray.length - 1]);
			//設定を描画
			sDraw();
			lastGpsNo = jData.no;
			//GPS取得前の画像一覧
			continue;
		    }
		    lastGpsNo = jData.no;
		    //位置データがなければ飛ばす
		    if (jData.lat === 'NoData') {
			continue;
		    }
		    //Chromeデベロッパー・ツールの機能 http://www.buildinsider.net/web/chromedevtools/01#page-9
		    //console.debug('Debug!! for()No：' + i + 'jData.no:' + jData.no);
		    //GPS更新後 ひとつ前の位置データを採用 データ一個だけ、最終はそのまま
		    if (i > 1 || i === jArray.length - 1) {
			jData = jArray[i - 1];
		    }
		    //画像クリア
		    //imgArray = [];

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
			icon: {path: 'M -2,2 0,-2 2,2 0,0 z', //arrowPath,
			    scale: 3,
			    strokeColor: '#00FF00',
			    rotation: jData.rota
				    //var arrowPath = google.maps.SymbolPath.FORWARD_CLOSED_ARROW; 矢印中心を移動したかっのでPath作った。
			}
		    });
		    marker.setMap(map);
		    // infowindow内のコンテンツ(html)を作成 http://kwski.net/api/799/
		    var time = new Date(jData.time); //time.toLocaleString()
		    infoWinMsg = '<div class="infowindow' + jData.no + '">'
			    + 'No.' + jData.no
			    + '<img src="' + imgfile + '" width="100">'
			    + time.toLocaleString() + '<br />'
			    + ',高度:' + Math.round(jData.alti) + 'm'
			    + ',方向:' + Math.round(jData.rota)
			    + '°,pitch ' + Math.round(jData.pitch)
			    + '°,roll:' + Math.round(jData.roll)
			    + '°<br>誤差:' + rAcc + 'm,'
			    + '操縦者からの向き:' + Math.round(head) + '°,距離:' + Math.round(dis) + 'm<br>';
		    //同一場所の画像表示
		    for (j = 0; j < infoImgArray.length - 1; j++) {
			infoWinMsg += ' [<a href="#" onclick="canvasDraw(' + infoImgArray[j] + ',' + i + ')">' + j + '</a>] ';
			if (j !== 0 && j % 12 === 0) {
			    infoWinMsg += '<br>';
			}
		    }
		    infoImgArray = [];
		    infoWinMsg += '</div>';
		    //関数で呼ばないとInfowindowが重なる
		    attachMessage(marker, infoWinMsg, i, jData.time, rPos, rAcc);
		}
	    }
	    lastNo = jArray.length;
	    if (rPos !== '') {
		if ($('#MapPanOff').prop('checked')) {
		    map.setCenter(rPos);
		}
		rPoly.setMap(null);
		rPoly.setMap(map);

		//半径を指定した円を地図上の中心点に描く http://www.nanchatte.com/map/circle-v3.html
		rAccCircle.setMap(null);
		rAccCircle.setCenter(rPos);
		// 中心点(google.maps.LatLng)
		if (rAcc > 100) {
		    rAcc = 100;
		}
		rAccCircle.setRadius(rAcc);
		rAccCircle.setMap(map);
		//現在位置
		$('#droidroneStat').html("No.: " + jData.no
			+ ", 現在位置　lat:" + jData.lat
			+ ", lag:" + jData.lng
			+ ", 高度:" + jData.alti);
	    }

	    // 画像更新確認
	    if (lastImgfile === imgfile) {
		//canvasStat.innerHTML = '画像データ更新なし : ' + lastImgfile;
		return;
	    }
	    lastImgfile = imgfile;

	    /* Imageオブジェクトを生成 */
	    var img = new Image();
	    img.src = imgfile;
	    //canvasStat.innerHTML = "c1読み込み" + imgfile;
	    /* 画像が読み込まれるのを待ってから処理を続行 */
	    img.onload = function () {
		//画像
		var canvas = document.getElementById('c1');
		var ctx = canvas.getContext('2d');
		//鏡像
		//ctx.translate(canvas.width, 0);
		//ctx.scale(-1, 1);
		ctx.drawImage(img, 0, 0, img.width, img.height);
		//canvasStat.innerHTML = "c1描画" + lastImgfile;
	    };
	    if (imgNo === 0) { //c2　初期描画
		var fileTime = imgArray[0];
		canvasDraw(fileTime, 0, "最初の画像ファイル");
	    }
	},
	error: function () {
	    $('#serverStat').html(dir + '/ GPSデータ待ち');
	}
    });
}

//ローバーアイコンのWindow
var lastInfoWin = new google.maps.InfoWindow();
function attachMessage(marker, msg, no, time, pos, acc) {
    //http://www.nanchatte.com/map/showDifferentInfoWindowOnEachMarker.html
    var infoWin = new google.maps.InfoWindow({
	maxWidth: 300, // infowindowの最大幅を設定
	content: msg
    });
    // イベントを取得するListenerを追加
    google.maps.event.addListener(marker, 'click', function () {
	//次のウィンドウが表示されるまでウィンドウを表示
	lastInfoWin.close();
	lastInfoWin = infoWin;
	//ウィンドウオープン
	infoWin.open(marker.getMap(), marker);
	if (time !== '') {
	    canvasDraw(time, no);
	}
	rAccCircle.setMap(null);
	//半径を指定した円を地図上の中心点に描く http://www.nanchatte.com/map/circle-v3.html
	rAccCircle.setCenter(pos);
	// 中心点(google.maps.LatLng)
	if (acc > 100) {
	    acc = 100;
	}
	rAccCircle.setRadius(acc);
	rAccCircle.setMap(map);
    });
    // mouseoutイベントを取得するListenerを追加
    //google.maps.event.addListener(marker, 'mouseout', function(){
    google.maps.event.addListener(marker, 'closeclick', function () {
	infoWin.close();
    });
}

//現在地の地図を表示
function setMap(lastData) {
    var lastPos = new google.maps.LatLng(lastData.lat, lastData.lng);
    var mapOptions = {
	zoom: 18,
	center: lastPos,
	mapTypeId: google.maps.MapTypeId.ROADMAP,
	//mapTypeId: google.maps.MapTypeId.TERRAIN
	noClear: false //http://www.openspc2.org/Google/Maps/api3/Map_option/noClear/
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    // Add a listener for the click event
    google.maps.event.addListener(map, 'click', addLatLng);
    //GoogleMap高度を調査。GPS高度と比べて見る
    //https://developers.google.com/maps/documentation/javascript/examples/elevation-simple
    //http://www.nanchatte.com/map/getElevationForLocation.html
    //GPS/地図の高度データが信用ならない理由 http://www.sc-runner.com/2013/07/why-gps-altitude-not-accurate.html
    //What vertical datum is used in Google Earth https://productforums.google.com/forum/#!topic/maps/FZkvHCNri0M　(海水面高度か？）
    // リクエストを発行  locations: 要素が１つでも配列に…。
    elevation.getElevationForLocations({locations: [lastPos]}, function (results, status) {
	if (status === google.maps.ElevationStatus.OK) {
	    if (results[0].elevation) {
		// 標高ゲット！
		var gElev = results[0].elevation;
		droidroneStat.innerHTML += 'Google高度:' + Math.round(gElev) + 'm'
			+ ', GPS高度:' + Math.round(lastData.alti) + 'm'
			+ ', 推定GPS高度誤差:' + Math.round(lastData.alti - gElev) + 'm';
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
var sLastInfowindow = new google.maps.InfoWindow();
;

//設定経路描画
function sDraw() {
    if (dir === 0) {
	return;
    }
    //set.txt読み込み
    $.ajax({
	url: 'data/' + dir + '/set.txt',
	type: 'GET',
	dataType: 'text',
	cache: false,
	success: function (res) {
	    var sPath = sPoly.getPath();
	    var sArray = res.split(/\r\n|\r|\n/);
	    sArray.pop(); //最終行が空白のため要素を削除
	    //console.debug('Debug!! 1 sArray.length: ' + sArray.length);
	    var sPos;
	    for (var i = 0; i < sArray.length; i++) {
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
		    icon: {path: circlePath, //arrowPath,
			scale: 3,
			strokeColor: '#FFFF00'
		    }
		});
		marker.setMap(map);
		// infowindo内のコンテンツ(html)を作成 http://kwski.net/api/799/
		var sInfoWinMsg = 'No.' + sPath.length + '<br />'
			+ '高度: ' + Math.round(sData.alti) + 'm'
			+ ', ローバー方向: ' + sData.rota + '°,垂直角: ' + sData.pitch + '°<br />'
			+ '操縦者からの向き: ' + Math.round(head) + '°,距離: ' + Math.round(dis) + 'm';
		//関数で呼ばないとInfowindowが重なる
		attachMessage(marker, sInfoWinMsg, '');
	    }
	    sLastInfowindow.setContent('#' + sArray.length);
	    sLastInfowindow.setPosition(sPos);
	    sLastInfowindow.open(map);
	    //console.debug('Debug!! 2 sArray.length: ' + sArray.length);
	    //sPoly.setMap(null);
	    sPoly.setMap(map);
	},
	error: function () {
	    $('#serverStat').html(dir + '/ GPSデータ待ち');
	}
    });
}

//JS本　P232　ID版　http://www.ipentec.com/document/document.aspx?page=javascript-get-selectbox-value
//データディレクトリ変更
function chgDir() {
    //accCircle.setMap(null);
    //poly.setMap(null);
    //path = [];
    dir = $('#dir').val();
    $('#serverStat').html('読み込みDir/' + dir);
    //初期設定
    clearMap();
}
//GeoJSONエディタ作ってみた。//http://shimz.me/blog/map/4225
//path json 表示
//var pathJson = document.getElementById("path-json");
//pathJson.innerHTML = JSON.stringify(path);
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
    //設定状態かチェック
    if (!$('#cSetOn').prop('checked')) {
	return;
    }
    //現在位置マップ中心を無効
    $('#MapPanOff').prop('checked', false);
    var sPath = sPoly.getPath();
    // Because path is an MVCArray, we can simply append a new coordinate
    // and it will automatically appear.
    var sPos = event.latLng;
    sPath.push(sPos);
    sPoly.setMap(map);
    var num = sPath.getLength();
    var sInfowindow = new google.maps.InfoWindow();
    sInfowindow.close();
    sInfowindow.setContent('#' + num
	    + '<form id="formSet" action="">'
	    + '高度設定<select id="alti">' + altiOption + '</select><br />'
	    + '方向設定<select id="rota">' + rotaOption + '</select><br />'
	    + 'カメラ上下<select id="pitch">' + pitchOption + '</select>'
	    + '</form>'
	    + '<button id="dataSet">データ登録</button>'
	    );
    sInfowindow.setPosition(sPos);
    sInfowindow.open(map);

    //infowindow close event/callback 設定位置変更
    google.maps.event.addListener(sInfowindow, 'closeclick', function () {
	sPath.pop();
	//設定継続
	$('#cSetOn').prop('checked', true);
    });
    //addEventListener は、 1 つのイベントターゲットにイベントリスナーを 1 つ登録します。
    //https://developer.mozilla.org/ja/docs/Web/API/EventTarget/addEventListener
    //jQuery】フォーム部品の取得・設定まとめ http://qiita.com/kazu56/items/36b025dac5802b76715c
    if (dir === 0) {
	return;
    }
    $('#dataSet').click(function () {
	var sJson = '{"no":' + num
		+ ',"lat":' + sPos.lat()
		+ ',"lng":' + sPos.lng()
		+ ',"alti":' + $('#alti').val();
	+',"rota":' + $('#rota').val();
	+',"pitch":' + $('#pitch').val();
	+"}\n";    //改行で配列にする
	sJson.innerHTML = sJson;
	//console.debug('Debug!! 2 setJSON: ' + "\n" + sJson);
	$.ajax({
	    url: cgi + 'act=SET&dir=' + dir + "&txt=" + encodeURIComponent(sJson),
	    type: 'GET',
	    dataType: 'text',
	    cache: false,
	    success: function (res) {
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
		sLastInfowindow.setContent('#' + num);
		sLastInfowindow.setPosition(sPos);
		sLastInfowindow.open(map);
		//設定継続
		$('#cSetOn').prop('checked', true);
	    },
	    error: function () {
		$('#serverStat').html(dir + "/ セットデータ作製");
	    }
	});
    });
}

