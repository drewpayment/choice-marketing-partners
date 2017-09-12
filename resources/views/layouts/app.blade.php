<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta id="global-token" name="token" content="{{csrf_token()}}">

    <title>@yield('title')</title>

    <!-- Fonts -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css" integrity="sha384-XdYbMnZ/QjLh6iI4ogqCTaIjrFk87ip+ekIjefZch0Y+PvJ8CDYtEs1ipDmPorQ+" crossorigin="anonymous">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lato:100,300,400,700">

    <!-- Styles -->
    {{--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">--}}
    {{--<link rel="stylesheet" href="{{url('css/bootstrap/bootstrap.min.css')}}"> removed because gulped bootstrap into all.css--}}
    {{--<link rel="stylesheet" href="{{url('css/bootstrap/bootstrap-theme.min.css')}}">--}}
    <!-- Latest compiled and minified Bootstrap select/option module -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.1/css/bootstrap-select.min.css">
    {{-- <link href="{{ elixir('css/app.css') }}" rel="stylesheet"> --}}
    <link rel="stylesheet" href="{{url('css/app.css')}}" type="text/css">
    <link rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/ax5ui/ax5ui-toast/master/dist/ax5toast.css" />

    <link rel="stylesheet" href="{{url('css/ionicons/ionicons.min.css')}}">
    <link rel="stylesheet" href="{{url('css/user.css')}}">
    <link rel="stylesheet" href="{{elixir('css/all.css')}}">
    {{-- Sandy Walker/WebUI-Popover --}}
    {{-- How do I only use local as backup? --}}
    {{--<link rel="stylesheet" href="https://cdn.jsdelivr.net/jquery.webui-popover/2.1.15/jquery.webui-popover.min.css">--}}
    <link rel="stylesheet" href="{{url('css/jquery.webui-popover.css')}}">
    <link rel="stylesheet" href="{{url('assets/jscrollpane/jquery.jscrollpane.css')}}">

    <!-- Slick Carousel http://kenwheeler.github.io/slick/ -->
    <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.css"/>
    <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"/>

    @yield('topCSS')

    <style>
        body {
            font-family: 'Lato';
        }

        .fa-btn {
            margin-right: 6px;
        }
    </style>

    <!-- jsPDF -->
    <script src="{{url('js/jspdf.js')}}"></script>
    <!-- jsPDF plugin Autotable: https://github.com/simonbengtsson/jsPDF-AutoTable -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/g/jquery.slick@1.6.0(slick-theme.css+slick.css)">

    {{--<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/2.3.0/jspdf.plugin.autotable.js"></script>--}}

    @yield('topJS')
</head>
<body id="app-layout">
    <nav class="navbar navbar-default navbar-fixed-top bg-blue">
        <div class="container">
            <div class="navbar-header">
                <a class="navbar-brand navbar-link navbar-title-text" href="{{url('/')}}">
                    <ul class="list-inline list-unstyled mt-neg-10 bg-gray br-5">
                        <li class="pr-0">
                            <img src="{{url('/images/cmp_logo_nowords.png')}}" width="40px" height="40px">
                        </li>
                        <li class="color-brand pl-0 pr-10 strong">
                            Choice Marketing Partners
                        </li>
                    </ul>
                </a>
                <button class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navcol-1">
                    <span class="sr-only">Toggle navigation</span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                </button>
            </div>
            <div class="collapse navbar-collapse" id="navcol-1">
                <ul class="nav navbar-nav navbar-right">
                    @if(!Auth::user())
                        <li role="presentation" id="homeLink">
                            <a href="{{url('/')}}" class="navbar-title-text">
                                <i class="fa fa-home"></i> Home
                            </a>
                        </li>
                        <li role="presentation" id="aboutLink">
                            <a href="/about-us" class="navbar-title-text">
                                <i class="fa fa-info"></i> About
                            </a>
                        </li>
                        <li role="presentation" id="loginLink">
                            <a href="{{url('/login')}}" class="navbar-title-text">
                                <i class="fa fa-sign-in"></i> Login
                            </a>
                        </li>
                    @endif
                    @if(Auth::user())
                    <li class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown"><i class="fa fa-th navbar-title-text color-white"></i> <span class="hidden-sm hidden-md color-white">Menu</span></a>
                        <ul class="dropdown-menu">
                            <li>
                                <a href="{{url('/')}}"><i class="fa fa-home"></i> Home</a>
                            </li>
                            <li class="divider"></li>
                            <li>
                                <a href="{{action('DocumentController@index')}}"><i class="fa fa-paperclip"></i> Documents</a>
                            </li>
                            <li>
                                {{--removed to launch new paystub module--}}
                                <a href="/historical-invoice-data"><i class="ion ion-social-usd"></i> Paystubs</a>
                                {{--<a href="/paystubs"><i class="fa fa-dollar"></i> Paystubs</a>--}}
                            </li>
                            @if(session('authenticatedUserIsAdmin'))
                                <li>
                                    <a href="/agents"><i class="fa fa-users"></i> Employees</a>
                                </li>
                                <li>
                                    <a href="/upload-invoice"><i class="fa fa-table"></i> Invoices</a>
                                </li>
                                <li class="divider"></li>
                                <li>
                                    <a href="{{url('/dashboards/dashboard')}}"><i class="fa fa-globe"></i> Admin</a>
                                </li>
                                <li>
                                    <a href="{{url('/overrides')}}"><i class="fa fa-cog"></i> Overrides</a>
                                </li>
                                <li>
                                    <a href="{{url('/dashboards/payroll-info')}}" data-toggle="tooltip" title="Track who we have paid by issue date.">
                                        <i class="fa fa-calculator"></i> Payroll Tracking
                                    </a>
                                </li>
                                {{--<li class="mobile-hidden">--}}
                                    {{--<a href="{{url('/invoices/edit-invoice')}}" data-toggle="tooltip" title="Edit an existing invoice.">--}}
                                        {{--<i class="fa fa-edit"></i> Edit Invoice--}}
                                    {{--</a>--}}
                                {{--</li>--}}
                                <li>
                                    <a href="{{url('/vendors')}}">
                                        <i class="fa fa-building"></i> Campaigns
                                    </a>
                                </li>
                            @endif
                            <li class="divider"></li>
                            <li id="logoutLink">
                                <a href="{{url('/logout')}}">
                                    <i class="fa fa-sign-out navbar-title-text"></i> Logout
                                </a>
                            </li>
                        </ul>
                    </li>
                    @endif
                </ul>
            </div>
        </div>
    </nav>

    <div class="site-content">

        @if(Session::has('alert'))
            <div class="alert alert-danger pt-10" id="display_msgs">
                {{ Session::get('alert') }}
            </div>
        @endif

        @if(Session::has('message'))
            <div class="alert alert-info pt-10" id="display_msgs">
                {{ Session::get('message') }}
            </div>
        @endif

        <div class="alert alert-info pt-10 hidden" id="js_msgs"></div>

        <div class="container">
            @yield('content')
        </div>

    </div>

     <footer class="footer pt-5">
        <div class="container">
            <div class="row">
                <div class="col-md-6 mobile-hidden">
                    <h4 id="footer-copyright"></h4>
                </div>
                <div class="col-md-6 social-icons">
                    <span class="pull-right">
                        <a href="/about-us"><i class="fa fa-info fa-2x"></i></a>
                        <a href="mailto:contactus@choice-marketing-partners.com"><i class="fa fa-paper-plane fa-2x"></i></a>
                        <a href="https://www.facebook.com/choicemarketingpartnersllc" target="_blank"><i class="fa fa-facebook fa-2x"></i></a>
                    </span>
                </div>
            </div>
        </div>
    </footer>

    @include('layouts.modal')
    @include('layouts.modal_layout')

    <a id="scrollToTop" href="#"><i class="fa fa-3x fa-chevron-circle-up"></i></a>

    <!-- JavaScripts -->
    {{--<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.3/jquery.min.js" integrity="sha384-I6F5OKECLVtK/BL+8iSLDEHowSAfUo76ZL9+kGAgTRdiByINKJaqTPH/QVNS1VDb" crossorigin="anonymous"></script>--}}
    <script src="{{url('js/jquery-3.1.1.min.js')}}"></script>
    {{--<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>--}}
    <script src="{{url('js/bootstrap.min.js')}}"></script>
    <script src="{{url('js/bootstrap-confirmation.min.js')}}"></script>
    <script src="{{url('js/config.js')}}"></script>
    <script src="{{ elixir('js/all.js') }}"></script>
    <!-- Latest compiled and minified Bootstrap select/option js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.1/js/bootstrap-select.min.js"></script>
    {{-- Sandy Walker WebUI Popover --}}
    {{--<script src="https://cdn.jsdelivr.net/jquery.webui-popover/2.1.15/loading.gif"></script>--}}
    {{--<script src="https://cdn.jsdelivr.net/jquery.webui-popover/2.1.15/jquery.webui-popover.min.js"></script>--}}
    <script src="{{url('js/jquery.webui-popover.js')}}"></script>
    <script src="https://cdn.rawgit.com/ax5ui/ax5core/master/dist/ax5core.min.js"></script>
    <script src="https://cdn.rawgit.com/ax5ui/ax5ui-toast/master/dist/ax5toast.min.js"></script>
    <!-- moment js plugin for dates -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.17.1/moment.min.js"></script>
    {{-- jscrollpane --}}
    {{--<script src="{{url('assets/jscrollpane/jquery.mousewheel.js')}}"></script>--}}
    {{--<script src="{{url('assets/jscrollpane/mwheelintent.js')}}"></script>--}}
    {{--<script src="{{url('assets/jscrollpane/jquery.jscrollpane.js')}}"></script>--}}
    {{--jquery scroll to plugin--}}
    <script src="http://cdnjs.cloudflare.com/ajax/libs/jquery-scrollTo/2.1.0/jquery.scrollTo.min.js"></script>
    {{-- http://selectize.github.io/selectize.js/ --}}
    <script src="{{url('/js/selectize.js')}}"></script>
    <script type="text/javascript">
        // opt-in to bootstrap tooltips
        $(function () {
            $('[data-toggle="tooltip"]').tooltip();
//            $('[data-usescroll="true"]').jScrollPane();

            var dt = new Date();
            var footerCopyrightText = "Choice Marketing Partners © " + dt.getFullYear();
            $('#footer-copyright').html(footerCopyrightText);

            $(window).scroll(function(){
                if($(this).scrollTop() > 50){
                    $('#scrollToTop').fadeIn();
                } else {
                    $('#scrollToTop').fadeOut();
                }
            });

            $('#scrollToTop').on('click', function(){
                $('html, body').animate({
                    scrollTop: 0
                }, 500);
                return false;
            });
        });

        $(document).ready(function(){
            $('ul.nav.navbar-nav li').on('click', function(){
                $('li').removeClass('active');
                $(this).addClass('active');
                $(this).find('navbar-title-text').removeClass('navbar-title-text');
            }).on('focusout', function(){
                if($(this).attr('id') !== 'Home'){
                    $('li').removeClass('active');
                    $(this).find('a').addClass('navbar-title-text');
                }
            });

            // globally set laravel token for all ajax calls
            $.ajaxSetup({
                headers: {
                    'X-CSRF-TOKEN': $('#global-token').attr('content')
                }
            })
        });

        (function(){
            var currentPage = window.location.pathname;

            switch(currentPage){
                case "/":
                    $('#homeLink').addClass('active');
                    $('#homeLink').find('.navbar-title-text').removeClass('navbar-title-text');
                    break;
                case "/login":
                    $('#loginLink').addClass('active');
                    $('#loginLink').find('.navbar-title-text').removeClass('navbar-title-text');
                    break;
                case "/dashboard":
                    $('#dashboardLink').addClass('active');
                    break;
                case "/about-us":
                    $('#aboutLink').addClass('active');
                    break;
                default:
                    break;
            }
        })();

        $('#dashboardLink').webuiPopover({
            type: 'async',
            url: '{{url('/dashboard')}}',
            backdrop: true,
            animation: 'pop'
        })

    </script>
    <script type="text/javascript">
        $('#display_msgs').fadeOut(3000);

        $(function(){
            var h = $('.wrapper').height()+20;
            var footer = $(window).height();

            if(h + 100 <= footer){
                $('.site-footer').css({
                    'top': footer - 100+'px',
                    'display': 'block'
                });
            } else {
                $('.site-footer').css({
                    'top': h+'px',
                    'display': 'block'
                })
            }
        })
    </script>

    {{--livereload js --- only for dev env--}}
    @if ( config('app.debug') )
        <script type="text/javascript">
            document.write('<script src="//localhost:35729/livereload.js?snipver=1" type="text/javascript"><\/script>')
        </script>
    @endif

    @yield('scripts')


</body>
</html>
