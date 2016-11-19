#!/usr/bin/perl
use KCatch qw( execdata );__DATA__
#http://hakuhin.jp/js/upload.html
use CGI;

# アップロードサイズの上限バイト数
$CGI::POST_MAX = 1024 * 1024 *10; #10Mbyte

# CGI オブジェクトを作成する
my $query = new CGI;

# param() メソッドを使って、名前を指定して値を取得する
my $act = $query->param("act");
print "Content-type: text/html; charset=utf-8\n\n";
mkdir("data");
chdir("data");

#データディレクトリ一覧
if ($act eq "DIRLIST") {
	print(join( ",", glob("*")));
	exit;
}

#ディレクトリ指定あり
my $dir = $query->param("dir");

#SkyWay perr-id.txt 作製
if ($act eq "SETID") {
    mkdir($dir);
    chdir($dir);
    my $id = $query->param("id");
    #ファイルロックディレクトリ作成
    open(IFH, "> peer-id.txt") || (print "perr-id.txt 書き込みopen失敗\n");
    print IFH $id; 
    close(IFH);
    print "SkyWay perr-id.txt : data/${dir}. ID : ${id}\n";
    #print ${txt};
    exit;
}

#データ読み込み
if ($act eq "READ") {
    chdir($dir);
    #ファイルロックディレクトリ作成
    if ( mkdir('rock', 0755) ) {
            #JSON用txt読み込み
            open(RFH, "< data.txt") || (print "${dir}/data.txt 読み込みopen失敗\n");
            #改行で配列要素とするJSON生成
            print "[";
            while (my $line = <RFH>) {
                    print $line . ",";
            }
            print "]";
            close(RFH);
            rmdir('rock');
    } else {
            print "data.txtファイルロック中\n";
    }
    exit;
}

#設定データ読み込み
if ($act eq "SETREAD") {
    chdir($dir);
    #ファイルロックディレクトリ作成
    if ( mkdir('srock', 0755) ) {
            #JSON用txt読み込み
            open(SRFH, "< set.txt") || (print "${dir}/set.txt 読み込みopen失敗\n");
            #改行で配列要素とするJSON生成
            print "{ \"setArray\" : [{}";
            while (my $line = <SRFH>) {
                    print "," . $line;
            }
            print "] }";
            close(SRFH);
            rmdir('srock');
    } else {
            print "set.txtファイルロック中\n";
    }
    exit;
}

#設定データ作製
if ($act eq "SET") {
    chdir($dir);
    my $txt = $query->param("txt");
    #ファイルロックディレクトリ作成
    if ( mkdir('srock', 0755) ) {
        open(SFH, ">> set.txt") || (print "set.txt書き込みopen失敗\n");
        print SFH $txt; 
        close(SFH);
        rmdir('srock');
        print "設定JSON用txt作成: ${dir}/set.txt\n";
        #print ${txt};
    } else {
            print "set.txtファイルロック中\n";
    }
    exit;
}


#操縦コマンド作製
if ($act eq "COM") {
    chdir($dir);
    my $command = $query->param("command");
    #ファイルロックディレクトリ作成
    if ( mkdir('crock', 0755) ) {
        open(CFH, "> command.txt") || (print "command.txt書き込みopen失敗\n");
        print CFH $command; 
        close(CFH);
        rmdir('crock');
        print "${command}受信";
    } else {
            print "command.txtファイルロック中\n";
    }
    exit;
}


#画像作製
if ($act eq "JPEG") {
   	#データディレクトリ作製
	mkdir($dir); #|| print("${dir}作成失敗");
	chdir($dir);
	
   #コマンド読み込み送信、ファイルロックディレクトリ作成
    if ( mkdir('crock', 0755) ) {
        open(CFH, "< command.txt") || (print "\n command.txtまだありません。\n");
        print <CFH>;
        close(CFH);
        rmdir('crock');
        print "\n commannd送信";
    } else {
            print "\n command.txtファイルロック中\n";
    }
	#Android 画像、軌跡データ作製
	my $base64 = $query->param("base64");
	use MIME::Base64 ();
	my $filename = $query->param("filename");
	#print "画像作成 ${dir}/${filename}\n";
	open(OUTFILE, "> ${filename}") || print("${dir}/${filename} open失敗\n");
	binmode(OUTFILE);
	#base64 jpeg
	my $decoded = MIME::Base64::decode($base64);
	print OUTFILE $decoded;
	print "${dir}/${filename} uplpad\n";
	close(OUTFILE);
	
	#データ作製
    my $txt = $query->param("txt");
	#ファイルロックディレクトリ作成
	if ( mkdir('rock', 0755) ) {
		#JSON用txt書き込み 改行で配列追加とする。
		open(WFH, ">> data.txt") || (print "data.txt書き込みopen失敗\n");
		print WFH $txt; 
		close(WFH);
		rmdir('rock');
		print "JSON用txt作成 :${dir}/data.txt\n";
		#print ${json};
	} else {
		print qq(data.txtファイルロック中);
	}
}
#print "REQUEST_METHOD : $ENV{'REQUEST_METHOD'} ";
print "CONTENT_LENGTH : " . $ENV{'CONTENT_LENGTH'};
exit;
