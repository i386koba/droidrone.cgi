/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 * 2015/9/17 Jquery に対応
 */
/* global URL */

//http://qiita.com/kazu56/items/36b025dac5802b76715c 【jQuery】フォーム部品の取得・設定まとめ
//2015.09　ビデオチャット＆テキストチャット作成チュートリアル！WebRTCを簡単＆柔軟に使える「SkyWay」を使ってみよう
//https://html5experts.jp/katsura/16331/
var localStream = null; // 自分の映像ストリームを保存しておく変数
var userMediaOn = false; //getUserMediaの結果；
// カメラ／マイクにアクセスするためのメソッドを取得しておく
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
//  マイクのストリームを取得する
// - 取得が完了したら、第二引数のFunctionが呼ばれる。呼び出し時の引数は自身のストリーム
// - 取得に失敗した場合、第三引数のFunctionが呼ばれる
navigator.getUserMedia({audio: true, video: false}, function (lStream) {
    // このストリームを通話がかかってき場合と、通話をかける場合に利用するため、保存しておく
    localStream = lStream;
    userMediaOn = true;
}, function (err) {
    alert("getUserMedia Error!\n" + err.message);
});
// SkyWayのシグナリングサーバーへ接続する (APIキーを置き換える必要あり）
var apiKey = '30fa6fbf-0cce-45c1-9ef6-2b6191881109';
var peerD = new Peer({key: apiKey, debug: 3});
peerD.on('error', function (err) {
    $("#messages").val($("#messages").val() + '\n peer-err : ' + err);
});
peerD.on('close', function () {
    peerD.destroy();
    $("#messages").val($("#messages").val() + '\n peer Close: : ');
});
var peerM;
//終了時
$(window).on("beforeunload", function () {
    peerD.destroy();
    peerM.destroy();
});
peerD.on('open', function () {
    // - 自分のIDはpeerオブジェクトのidプロパティに存在する
    var connID = peerD.id;
    $("#messages").val(' My ConnID : ' + connID);
    peerD.listAllPeers(function (peerArray) {
	for (var i = 0; i < peerArray.length; i++) {
	    var idStr = peerArray[i];
	    if (idStr !== connID) {
		$('#peers').append('<option>' + peerArray[i] + '</option>');
		$("#messages").val($("#messages").val() + '\n (' + i + ') listID : ' + peerArray[i]);
	    }
	}
    });
});
var peerdConn; // 接続したコネを保存しておく変数
//2015.06
var google;
var pos;
var map;
var rPoly;
var gamepadNo = -1;
var helloAndroid = false;
var rInfowindow = new google.maps.InfoWindow();
//https://developers.google.com/maps/documentation/javascript/reference#Circle
var rAccCircle = new google.maps.Circle({
    fillColor: '#ff0000', // 塗りつぶし色
    fillOpacity: 0.2, // 塗りつぶし透過度（0: 透明 ⇔ 1:不透明）
    strokeColor: '#ff0000', // 外周色
    strokeOpacity: 0.5, // 外周透過度（0: 透明 ⇔ 1:不透明）
    strokeWeight: 1         // 外周太さ（ピクセル）
}); //ＧＰＳ起動時のmap作成フラグ
var onGps = false;
//DOM読み込み完了　初期化
google.maps.event.addDomListener(window, 'load', initialize);
//地図クリア
function initialize() {
    rPoly = new google.maps.Polyline({
	strokeColor: '#0000FF',
	strokeOpacity: 1.0,
	strokeWeight: 3
    });
    $("#peers").change(function () {
	var destPeerId = $(this).val(); //Android のdataConn PeerID
	// 相手への接続を開始する
	peerdConn = peerD.connect(destPeerId);
	//, { serialization: 'none', metadata: {message: 'hi i want to chat with you!'} });
	$("#messages").val($("#messages").val() + '\n Try connect: ' + destPeerId);

	peerdConn.on('error', function (err) {
	    $("#messages").val($("#messages").val() + '\n conn-err: ' + err);
	});

	// 接続が完了した場合のイベントの設定
	peerdConn.on("open", function () {
	    $("#messages").val($("#messages").val() + '\n Open　connect: ' + peerdConn.peer);
	    //メディアストリームPeer
	    peerM = new Peer({key: apiKey, debug: 3});
	    //PeerM-err
	    peerM.on('error', function (err) {
		$("#messages").val($("#messages").val() + '\n PeerM-err : ' + err);
	    });
	    peerM.on('close', function () {
		peerM.destroy();
		$("#messages").val($("#messages").val() + '\n peerM Close: : ');
	    });
	    peerM.on('open', function () {
		// - 自分のIDはpeerオブジェクトのidプロパティに存在する
		var callID = peerM.id;
		$("#messages").val($("#messages").val() + '\n My CallID : ' + callID); // Call-IDのメッセージを送信
		// メッセージ受信イベントの設定
		peerdConn.on("data", function (res) {
		    //接続初回
		    if (helloAndroid === false) {
			$("#messages").val($("#messages").val() + '\n From Android: ' + res);
			// Call-IDのメッセージを送信
			peerdConn.send(callID);
			$("#messages").val($("#messages").val() + ' To Android: ' + callID);
			helloAndroid = true;
		    } else {
			rDraw(res);
		    }
		});
	    });
	    peerM.on('call', function (call) {
		// - 相手のIDはCallオブジェクトのpeerプロパティに存在する 		$("#messages").val($("#messages").val() + '\n Call from : ' + call.peer);
		if (userMediaOn === true) {
		    call.answer(localStream);
		    $("#messages").val($("#messages").val() + '\n call Answer localstream');
		} else {
		    call.answer();
		    $("#messages").val($("#messages").val() + '\n call Answer null');
		}
		call.on('stream', function (stream) {
		    // 映像ストリームオブジェクトをURLに変換する
		    // - video要素に表示できる形にするため変換している
		    var url = URL.createObjectURL(stream);
		    $("#messages").val($("#messages").val() + '/ stream url: ' + url);
		    // video要素のsrcに設定することで、映像を表示する 	 	
		    $('#android-video').prop('src', url);
		    //GamePad監視 一定時間隔で、繰り返し実行される関数 30FPS
		    if (gamepadNo !== -1) {
			setInterval(gamePadListen, 1000 / 30);
		    }
		});
		call.on('error', function (err) {
		    $("#messages").val($("#messages").val() + '\n call-err : ' + err);
		});
	    });
	});

    });
    //http://hakuhin.jp/js/gamepad.html#GAMEPAD_GAMEPAD_MAPPING
    // Gemapad API に対応しているか調べる
    if (!(window.Gamepad)) {
	$("#commandStat").val('NO GamePad-API.');
	return;
    }
    if (!(navigator.getGamepads)) {
	$("#commandStat").val('NO GamePad.');
	console.log('NO GamePad. nofunc');
	return;
    }
    // ゲームパッドを接続すると実行されるイベント (GamePadを接続してWeb開始すると呼ばれない）
    //window.addEventListener("gamepadconnected", function (e) {
// ゲームパッドリストを取得する
    var gamepad_list = navigator.getGamepads();
    if (gamepad_list.length === 0) {
	$("#commandStat").val('NO GamePad.');
	console.log('NO GamePad.' + gamepad_list.length);
	return;
    }
    var gStr;
    for (i = 0; i < gamepad_list.length; i++) {
// Gamepad オブジェクトを取得する
	if (!gamepad_list[i]) {
	    continue;
	}
	var gamepad = gamepad_list[i];
	// ゲームパッドの識別名
	var gStr = "id: " + gamepad.id + "\n";
	// ゲームパッドの物理的な接続状態
	gStr += "connected: " + gamepad.connected + "\n";
	// マッピングタイプ情報
	gStr += "mapping: " + gamepad.mapping + "\n";
	gamepadNo = i;
    }
    $("#commandStat").val(gStr + "gamepadNo : " + gamepadNo);
    console.log(gStr);
    //console.log(e.gamepad);
    //});
    // GamepadEvent に対応している 
    if (!window.GamepadEvent) {
	return;
    }
// ゲームパッドの接続を解除すると実行されるイベント
    window.addEventListener("gamepaddisconnected", function (e) {
	$("#commandStat").val("ゲームパッドの接続が解除" + e.gamepad);
	console.log("ゲームパッドの接続が解除");
	console.log(e.gamepad);
    });
//複数のマーカーをまとめて地図上から削除する http://googlemaps.googlermania.com/google_maps_api_v3/ja/map_example_remove_all_markers.html
}
var speed = 0; //前回と比較するためグローバル変数
var direction = 0;
function gamePadListen() {
    var gamepad_list = navigator.getGamepads();
    var gamepad = gamepad_list[gamepadNo];
// 軸リスト axes
    var axes = gamepad.axes;
    //http://www.w3.org/TR/gamepad/#remapping
    //左　上下　axes[1] 
    //右　左右　axes[2]
    //右　上下　axes[3]
    //console.log('gamepad' + gamepadNo + 'axes0' + axes[0]);
    if (Math.abs(speed - axes[1]) > 0.1 || Math.abs(direction - axes[3]) > 0.1) {
	speed = axes[1];
	direction = axes[3];
	var left = -1 * Math.round(speed * 100);
	var right = -1 * Math.round(direction * 100);
	if (Math.abs(left) < 20) {
	    left = 0;
	}
	if (Math.abs(right) < 20) {
	    right = 0;
	}
	command('M(' + left + ',' + right + ')', "GamePad");
    }

    /*   // ボタンリスト
     var str;
     var buttons = gamepad.buttons; 		 str += "buttons: {\n";
     var j;
     var n = buttons.length;
     for (j = 0; j < n; j++) {
     // GamepadButton オブジェクトを取得
     var button = buttons[j];
     str += "  \"" + j + "\": { ";
     // ボタン押下状態
     str += "pressed:" + button.pressed + " , ";
     // ボタン入力強度
     str += "value:" + button.value + " }\n";
     } */
}

// commandボタンクリック時の動作
function command(commandStr, btnStr) {
// 自分の画面に表示
    $("#commandStat").val('Send[' + commandStr + '] : ' + btnStr);
//console.log(commandStr);
    // Peer送信
    if ( peerdConn.open === true ) {
	peerdConn.send(commandStr);
    }
}

function rDraw(res) {
    var rPath = rPoly.getPath();
    var rPos = '';
    var infoWinMsg;
    //位置データ読み出し
    var jData = eval('(' + res + ')');
    //Chromeデベロッパー・ツールの機能 http://www.buildinsider.net/web/chromedevtools/01#page-9

    //BT受信 http://blog.tojiru.net/article/205007468.html
    if (jData.btr !== '') {
	$("#commandStat").val($("#commandStat").val() + '\n Droidrone BT res:' + jData.btr); //.css("font-weight", "bold"));
    }
//現在位置
    $('#droidroneStat').html("No.: " + jData.no + ", 現在位置 lat:" + jData.lat
	    + ", lag: " + jData.lng
	    + ", 高度: " + jData.alti + '°'
	    + ', 誤差: ' + jData.accuracy + 'm'
	    + ', 方向: ' + jData.rota + '°'
	    + ', pitch: ' + jData.pitch + '°'
	    + ', roll: ' + jData.roll + '°');
    if (jData.lat === 'NoData') {
	return;
    }
    //console.debug('Debug!! jData:' + res);
    rPos = new google.maps.LatLng(jData.lat, jData.lng);
    if (onGps === false) {
	var mapOptions = {
	    zoom: 18,
	    center: rPos, mapTypeId: google.maps.MapTypeId.ROADMAP,
	    //mapTypeId: google.maps.MapTypeId.TERRAIN
	    noClear: false //http://www.openspc2.org/Google/Maps/api3/Map_option/noClear/
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	gElevation(rPos);
	onGps = true;
    }

    // Because path is an MVCArray, we can simply append a new coordinate and it will automatically appear.
    rPath.push(rPos);
    //start地点からの方向と距離
    //https://developers.google.com/maps/documentation/javascript/reference?hl=ja#MVCArray 	 //https://developers.google.com/maps/documentation/javascript/reference?hl=ja#spherical
    //// 距離、方向計算のコンストラクタ
    //var spherical = google.maps.geometry.spherical;
    //var head = spherical.computeHeading(pos, rPos);
    //var dis = spherical.computeDistanceBetween(pos, rPos);
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
	    // '<img src="' + imgfile + '" width="100">'
	    + ', ' + time.toLocaleString() + '<br />'
	    + ',高度:' + jData.alti + 'm'
	    + ',方向:' + jData.rota + '°' + ',pitch ' + jData.pitch + '°'
	    + ',roll:' + jData.roll + '°'
	    + '<br>誤差:' + jData.accuracy + 'm,';
    //+ '操縦者からの向き:' + Math.round(head) + '°,距離:' + Math.round(dis) + 'm<br></div>';

    //関数で呼ばないとInfowindowが重なる
    attachMessage(marker, infoWinMsg, rPos, jData.accuracy);
    if ($('#MapPanOff').prop('checked')) {
	map.setCenter(rPos);
    }
    rPoly.setMap(null);
    rPoly.setMap(map);
    //半径を指定した円を地図上の中心点に描く http://www.nanchatte.com/map/circle-v3.html
    rAccCircle.setMap(null);
    rAccCircle.setCenter(rPos);
    // 中心点(google.maps.LatLng)
    if (jData.accuracy > 100) {
	jData.accuracy = 100;
    }
    rAccCircle.setRadius(jData.accuracy);
    rAccCircle.setMap(map);
}


//ローバーアイコンのWindow
var lastInfoWin = new google.maps.InfoWindow();
//ローバー(ドロイドローン)アイコン表示
function attachMessage(marker, msg, pos, acc) {
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

//現在地の地図の高度を表示
function gElevation(pos) {
    // Add a listener for the click event
    //google.maps.event.addListener(map, 'click', addLatLng);
    //GoogleMap高度を調査。GPS高度と比べて見る
    //https://developers.google.com/maps/documentation/javascript/examples/elevation-simple
//http://www.nanchatte.com/map/getElevationForLocation.html
    //GPS/地図の高度データが信用ならない理由 http://www.sc-runner.com/2013/07/why-gps-altitude-not-accurate.html
    //What vertical datum is used in Google Earth https://productforums.google.com/forum/#!topic/maps/FZkvHCNri0M　(海水面高度か？）
// ElevationServiceのコンストラクタ
    var elevation = new google.maps.ElevationService();
    // リクエストを発行  locations: 要素が１つでも配列に…。
    elevation.getElevationForLocations({locations: [pos]}, function (results, status) {
	if (status === google.maps.ElevationStatus.OK) {
	    if (results[0].elevation) {
		// 標高ゲット！
		var gElev = results[0].elevation;
		$("#messages").val($("#messages").val() + '\n GoogleMAPの高度:' + Math.round(gElev) + 'm');
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

