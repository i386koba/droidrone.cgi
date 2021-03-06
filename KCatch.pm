# -------------------------------------------------------------------- #
#   KCatch.pm - Catch warn and die to avoid "Internal Server Error"
#   Copyright (C) 1999-2002 Kawasaki Yuusuke <u-suke@kawa.net>
# -------------------------------------------------------------------- #

=head1 NAME

KCatch.pm - Catch warn and die to avoid "Internal Server Error"

=head1 SYNOPSIS

    use KCatch;
    print "Content-Type: text/html\n\n";
    warn;
    die;

=head1 DESCRIPTION

    1ST STEP) Upload KCatch.pm to your script's directory or to @INC.
    2ND STEP) Insert just a line "use KCatch;" at top of your script.
    3RD STEP) This module could not work without the bug you made! :-)

=head1 OPTIONS

    use KCatch qw( [OPTIONS] );

KCatch.pm would automatically detect whether running under CGI or not, 
when no options given. Available options are following:

    use KCatch qw( plain );             # Original style
    use KCatch qw( mode=plain );        # New style

Force to make output as plain text for command-line use.

    use KCatch qw( html );              # Original style
    use KCatch qw( mode=html );         # New style

Force to make output as HTML for CGI.

    use KCatch qw( source );

Display also warned or died Perl source code for debugging.
(Note: The options could make influence on some security problems
 to display your code for the users.)

    use KCatch qw( stderr );

Output additional information of CGI to STDERR.
Usually, it would be saved to "/usr/local/apache/logs/error_log".

    use KCatch qw( execdata );__DATA__

Execute code after token "__DATA__" in the file which calls KCatch.
You should put the token "__DATA__" just next to call KCatch.
This option is VERY STRONG to force to catch almost the all errors,
and becomes the Savior in case your-annoying-bugs never disappears!

    use KCatch qw( jcode=sjis );
    use KCatch qw( jcode=euc );
    use KCatch qw( jcode=jis );

Convert the charactor-code-set of the error infomations for Japanese.
This option make work when "jcode.pl" is already required.
Or Jcode=* option is also available with "Jcode.pm".

=head1 VERSIONS

    1999/11/05 v1.02 First Release
    1999/11/23 v1.03 Recognize between under "use" and "require"
    2000/04/25 v1.04 Bug fix: undefined $ENV{GATEWAY_INTERFACE}
    2000/05/03 v1.05 Add options "use KCatch qw( source );", etc.
    2000/05/05 v1.06 Bug fix: undefined $ENV{REQUEST_URI}
    2000/08/04 v1.07 Output additional information to STDERR
    2000/10/27 v1.08 No use of uninitialized values
    2000/12/09 v1.10 the Savior option qw( execdata ) avaliable!
                     output templete separated, jcode=* supported
    2000/12/16 v1.11 Bug fix: get_caller() with execdata option
    2002/06/29 v1.12 Bug fix: enable html_filter() at html mode.
    2002/07/01 v1.13 Bug fix: Use of uninitialized value

=head1 SITES

    http://www.kawa.net/works/perl/catch/news.html
    http://www.harukaze.net/~mishima/perl/cgi-debug-env/deb-tech.html
    http://www.we-box.com/800weblec/ise.html

=head1 THANKS

Yukitoshi Ooie <yukitos@psycrosis.homeip.net>

=head1 AUTHOR

Copyright 1999-2002 Kawasaki Yusuke <u-suke@kawa.net>

=cut
# -------------------------------------------------------------------- #
    package KCatch;
    use strict;
    require 5.005;
# -------------------------------------------------------------------- #
    my $argv = {};                          # option arguments of "use"
    my $messbuf = [];                       # error messages buffer
    my $imported;                           # cache who use KCatch.pm
    my $in_execdata;                        # force to catch "warn" in "eval"
    $main::SIG{__WARN__} = \&catch_warn;    # catch the signal from warn()
    $main::SIG{__DIE__}  = \&catch_die;     # catch the signal from die()
# -------------------------------------------------------------------- #
sub import {
    my $package = shift;
    foreach my $elem ( @_ ) {
        my( $key, $value ) = split( /=/, $elem, 2 );
        $value = ! undef unless defined $value;
        $argv->{$key} = $value;
    }
    $imported = [ caller() ];
}
# -------------------------------------------------------------------- #
sub catch_warn {
    my $mess = shift;
#   print "<warn> $mess";
    my $called = &get_caller( 1 );
    push( @$messbuf, [ "warn", $mess, @$called ] ) if $called;
    CORE::warn( $mess );
}
# -------------------------------------------------------------------- #
sub catch_die {
    my $mess = shift;
#   print "<die> $mess";
    my $called = &get_caller();
    push( @$messbuf, [ "die", $mess, @$called ] ) if $called;
    CORE::die( $mess );
}
# -------------------------------------------------------------------- #
END {
    if ( $argv->{execdata} ) {          # execute __DATA__ area under eval
        &exec_data_area();
    }
    return if ( $#$messbuf < 0 );       # exit if no errors
    if ( $argv->{stderr} ) {
        &disp_stderr();                 # additional information
    }
    &make_output();                     # display buffer
}
# -------------------------------------------------------------------- #
sub env {
    $ENV{$_[0]} if exists $ENV{$_[0]};
}
# -------------------------------------------------------------------- #
#   execute source after __DATA__ token
# -------------------------------------------------------------------- #
sub exec_data_area {
    my $package = $imported->[0];
    if ( $package ne "main" ) {
        my $mess = "the option 'execdata' is not avaliable ".
                   "outside of main package, sorry.\n";
        push( @$messbuf, [ "error", $mess, @$imported ] );
        return;
    }
    my $handle;
    {
        no strict "refs";
        my $hndstr = "${package}::DATA";    # <packagename::DATA>
        $handle = \*$hndstr;                # string to handle
    }
    my $evalsrc = [ <$handle> ];            # read __DATA__ source
    my $string = join( "", @$evalsrc );     # join to one string
    $in_execdata ++;
    {
        package main;
        eval $string;                       # execute code
    }
    $in_execdata --;
    &died_in_data_area( $@ ) if $@;
}
# -------------------------------------------------------------------- #
sub died_in_data_area {         # to catch compile error and so on
    my $estr = shift;           # do nothing already died
    return if ( $#$messbuf > -1 && $messbuf->[$#$messbuf]->[0] eq "die" );

    # die "some string."   => can detect the line where error occured.
    # die "some string.\n" => cannot detect the line where...
    $estr =~ s/(,)? at \(eval \d+\) line (\d+)(,? <DATA> line (\d+)(\.)?)?/$5||$1/e;
    my $line = $2;
    my $called = [ @$imported ];
    $called->[2] += $line;
    push( @$messbuf, [ "die", $estr, @$called ] )
}
# -------------------------------------------------------------------- #
#   Output additional information to STDERR
# -------------------------------------------------------------------- #
sub disp_stderr {
    my $name = ( $0 =~ m#([^/]+)$# )[0];
    my $qlength = (( &env("REQUEST_METHOD") eq "POST" )
                   ? &env("CONTENT_LENGTH")
                   : length( &env("QUERY_STRING") )) || 0;
    my $datetime = &get_datetime();
    my $url = &env("REQUEST_URI");
    $url =~ s/\?.*$//;
    printf STDERR "(Catch) %s %s [%05d] %s %s (%s) \"%s\"\n",
                   map { $_ ne "" ? $_ : "-" }      # I don't like blanks.
                   $datetime, $name, $$, &env("REMOTE_ADDR"),
                   $url, $qlength, &env("HTTP_USER_AGENT");
}
# -------------------------------------------------------------------- #
sub get_datetime {
    my( $sec, $min, $hour, $day, $mon, $year ) = localtime();
    my $datetime = sprintf( "%04d/%02d/%02d %02d:%02d:%02d",
                   $year+1900, $mon+1, $day, $hour, $min, $sec );
    $datetime;
}
# -------------------------------------------------------------------- #
#   make output
# -------------------------------------------------------------------- #
sub make_output {
    my $mode = &select_output_mode();
    my $errorinfo = &conv_disp();
    if ( $mode eq "html" ) {
        $errorinfo = &html_filter( $errorinfo );
    }
    my $var = { %ENV };
    $var->{datetime} = localtime();
    $var->{errorinfo} = $errorinfo;
    $var->{filename} = ( $0 =~ m#([^/]+)$# )[0];
    $var->{version} = " (Version $main::VERSION)" if defined $main::VERSION;
    $var->{perlver} = $];
    $var->{osname}  = $^O;
    my $output;
    if ( $mode eq "html" ) {
        $output = &templete_for_html();
    } else {
        $output = &templete_for_plain();
    }
    $output =~ s/\{(\w+)\}/((defined $var->{$1})?$var->{$1}:"")/eg;
    print $output;
}
# -------------------------------------------------------------------- #
#   select output mode
# -------------------------------------------------------------------- #
sub select_output_mode {
    return $argv->{mode} if defined $argv->{mode};
    my $mode = "plain";                 # Plain text as default
    if ( $argv->{html} ) {
        $mode = "html";                 # Force HTML
    } elsif ( $argv->{plain} ) {
        $mode = "plain";                # Force plain text
    } elsif ( &env("GATEWAY_INTERFACE") =~ /cgi/i ){
        $mode = "html";                 # Auto detect CGI
    }
    $mode;
}
# -------------------------------------------------------------------- #
sub html_filter {
    my $str = shift;
    $str =~ s#^>#\255#mg;               # included messaege (source code)
    $str =~ s#&#&amp;#g;
    $str =~ s#<#&lt;#g;
    $str =~ s#>#&gt;#g;
    $str =~ s:^\255(.*)$
             :</b><font color="#008080">&gt;\t$1</font><b>:mgx;
    $str =~ s#$#<br>#mg;
    $str;
}
# -------------------------------------------------------------------- #
#   Format warn/die message into text for output
# -------------------------------------------------------------------- #
sub conv_disp {
    my $option = shift;
    my $oarray = [];
    foreach my $iarray ( @$messbuf ){
        my( $type, $mess, $pack, $file, $line, $sub, $src ) = @$iarray;
        $src ||= "";                            # No-use of uninitialized value
        $file =~ s#^.*[/\\]##;                  # En-short the filename
        chomp $mess;
        my $eline = sprintf( "[%s:%s:%s] %s\n", 
                    $file, ($line||"?"), $type, $mess );
        push( @$oarray, $eline );
        if ( $argv->{source} ) {
            if ( $src eq "" and $line > 0 ) {
                $src = &read_source_line( $file, $line );
            }
            push( @$oarray, "> $src" ) if ( $src ne "" );
        }
    }
    if( $argv->{jcode} and defined $jcode::version ) {
        1 if defined $jcode::version;           # (not typo)
        foreach my $str ( @$oarray ) {
            &jcode::convert( \$str, $argv->{jcode} );
        }
    } elsif( $argv->{Jcode} and defined $Jcode::VERSION ) {
        1 if defined $Jcode::VERSION;           # (not typo)
        foreach my $str ( @$oarray ) {
            &Jcode::convert( \$str, $argv->{Jcode} );
        }
    }
    my $ostr = join( "\n", @$oarray );
    $ostr =~ s/[\n\r]+/\n/sg;
    $ostr =~ s/\n+$//sg;
    $ostr;
}
# -------------------------------------------------------------------- #
#   read source file
# -------------------------------------------------------------------- #
sub read_source_line {
    my $file = shift;
    my $lnum = shift;
    return unless ( -r $file );
    open ( TEMP, $file ) or return;
    my $c = 1;
    my $oline;
    while ( $oline = <TEMP> ){
        last if ( $lnum == $c++ );
    }
    close( TEMP );
    $oline;
}
# -------------------------------------------------------------------- #
#   false when in eval, or return caller (except for Carp.pm)
# -------------------------------------------------------------------- #
sub get_caller {
    my $warnflg = shift;
    my $c = 1;
    my $result;

    while( 1 ){
        my( $pack, $file, $line, $sub, $hasargs,
            $wantarray, $evaltext, $is_require ) = caller( $c ++ ) or last;
#       print "[f=$file] [l=$line] [s=$sub] [e=",($evaltext ne ""),
#             "] [i=$in_execdata] [w=$warnflg] [r=$result]\n";
        if ( $is_require ) {                    # between require or use
            last;
        } elsif ( $sub eq "(eval)" ) {          # eval
            if ( $in_execdata && $result && $file eq "KCatch.pm" ) {
                                                # under "execdata" option
                my $oldline = $result->[2] || 1;
                if ( $warnflg ) {               # warn
                    if ( $result->[1] =~ /^\(eval/ ){   # other source
                        $result->[1] = $imported->[1];
                        $result->[2] += $imported->[2];
                        $result->[4] = (split( /\n/, $evaltext ))[$oldline-1];
                    }
                } else {                        # die
                    if ( $result->[1] =~ /^\(eval/ ){   # other source
                        return;
                    }
                }
            } else {
                return;                         # don't catch in eval
            }
            last;
        } elsif ( $pack eq "Carp" ){
            $c ++;                              # skip to previous caller
        } else {
            $result ||= [ $pack, $file, $line, $sub ];
        }
    }
    $result;
}
# -------------------------------------------------------------------- #
#   Output templete for plain text.
# -------------------------------------------------------------------- #
sub templete_for_plain {'
Catch: {datetime}
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
{errorinfo}
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
{filename}{version} with Perl {perlver} for {osname}
';}
# -------------------------------------------------------------------- #
#   Output templete for HTML (HTTP+HTML header magic)
# -------------------------------------------------------------------- #
sub templete_for_html {'Catch: {datetime}<hr><!-- >
Content-Type: text/html

<html><head>
<title>Catch: {datetime}</title>
</head><body text="#000000" bgcolor="#FFFFFF">
Catch: {datetime}<hr><! -->
<tt><b><font color="#E00000">
{errorinfo}
</font></b></tt><hr>
{filename} {version}
with Perl {perlver} for {osname}
</body></html>
';}
# -------------------------------------------------------------------- #
;1;
# -------------------------------------------------------------------- #
