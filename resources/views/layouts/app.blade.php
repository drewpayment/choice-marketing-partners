<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta id="global-token" name="token" content="{{csrf_token()}}">

    <title>Choice Marketing Partners - @yield('title')</title>

    <!-- Fonts -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css" integrity="sha384-XdYbMnZ/QjLh6iI4ogqCTaIjrFk87ip+ekIjefZch0Y+PvJ8CDYtEs1ipDmPorQ+" crossorigin="anonymous">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lato:100,300,400,700">

    <!-- Styles -->
    {{--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">--}}
    <link rel="stylesheet" href="{{url('css/bootstrap/bootstrap.min.css')}}">
    <link rel="stylesheet" href="{{url('css/bootstrap/bootstrap-theme.min.css')}}">
    <!-- Latest compiled and minified Bootstrap select/option module -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.1/css/bootstrap-select.min.css">
    {{-- <link href="{{ elixir('css/app.css') }}" rel="stylesheet"> --}}
    <link rel="stylesheet" href="{{url('css/app.css')}}" type="text/css">
    <link rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/ax5ui/ax5ui-toast/master/dist/ax5toast.css" />

    <link rel="stylesheet" href="{{url('css/ionicons/ionicons.min.css')}}">
    <link rel="stylesheet" href="{{url('css/user.css')}}">
    <link rel="stylesheet" href="{{url('css/all.css')}}">
    {{-- Sandy Walker/WebUI-Popover --}}
    {{-- How do I only use local as backup? --}}
    {{--<link rel="stylesheet" href="https://cdn.jsdelivr.net/jquery.webui-popover/2.1.15/jquery.webui-popover.min.css">--}}
    <link rel="stylesheet" href="{{url('css/jquery.webui-popover.css')}}">

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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/2.3.0/jspdf.plugin.autotable.js"></script>

    @yield('topJS')
</head>
<body id="app-layout">
<div class="wrapper">
<nav class="navbar navbar-default navbar-fixed-top bg-blue">
    <div class="container">
        <div class="navbar-header"><a class="navbar-brand navbar-link navbar-title-text" href="{{url('/')}}"><i class="glyphicon glyphicon-globe"></i>Choice Marketing Partners</a>
            <button class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navcol-1"><span class="sr-only">Toggle navigation</span><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></button>
        </div>
        <div class="collapse navbar-collapse" id="navcol-1">
            <ul class="nav navbar-nav navbar-right">
                @if(!Auth::user())
                    <li role="presentation" id="homeLink">
                        <a href="{{url('/')}}" class="navbar-title-text">
                            <i class="icon ion-home"></i> Home
                        </a>
                    </li>
                    <li role="presentation" id="loginLink">
                        <a href="{{url('/login')}}" class="navbar-title-text">
                            <i class="icon ion-log-in"></i> Login
                        </a>
                    </li>
                @endif
                @if(Auth::user())
                <li class="dropdown">
                    <a href="#" class="dropdown-toggle" data-toggle="dropdown"><i class="icon ion-grid navbar-title-text"></i> <span class="hidden-sm hidden-md hidden-lg">Menu</span></a>
                    <ul class="dropdown-menu">
                        <li>
                            <a href="{{action('DocumentController@index')}}"><i class="ion ion-android-attach"></i> Documents</a>
                        </li>
                        <li>
                            <a href="/historical-invoice-data"><i class="ion ion-social-usd"></i> Paystubs</a>
                        </li>
                        @if(session('authenticatedUserIsAdmin'))
                            <li>
                                <a href="{{action('EmpManagerController@index')}}"><i class="ion ion-android-contacts"></i> Employees</a>
                            </li>
                            <li>
                                <a href="/upload-invoice"><i class="ion ion-android-document"></i> Invoices</a>
                            </li>
                            <li class="divider"></li>
                            <li>
                                <a href="{{url('/dashboards/dashboard')}}"><i class="ion ion-planet"></i> Admin</a>
                            </li>
                            <li>
                                <a href="{{url('/dashboards/payroll-info')}}" data-toggle="tooltip" title="Track who we have paid by issue date.">
                                    <i class="ion ion-clipboard"></i> Payroll Tracking
                                </a>
                            </li>
                            <li>
                                <a href="{{url('/invoices/edit-invoice')}}" data-toggle="tooltip" title="Edit an existing invoice.">
                                    <i class="ion ion-edit"></i> Edit Invoice
                                </a>
                            </li>
                        @endif
                    </ul>
                </li>
                <li id="logoutLink">
                    <a href="{{url('/logout')}}">
                        <i class="fa icon ion-log-out navbar-title-text"></i> <span class="hidden-sm hidden-md hidden-lg">Logout</span>
                    </a>
                </li>
                @endif
            </ul>
        </div>
    </div>
</nav>

<div class="container">

    <div class="pt-10">&nbsp;</div>

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

    @yield('content')

</div>
</div>

<nav class="navbar navbar-default navbar-fixed-bottom">
    <div class="container-fluid">
        <div class="row">
            <div class="col-md-10 col-md-offset-1">
                <h5 class="text-center"><a href="https://twitter.com/VerostackDev" class="text-muted" target="_blank">Inspired and designed by: Verostack Development</a></h5>
            </div>
        </div>
    </div>
</nav>
{{-- <footer class="site-footer">
    <div class="container">
        <div class="row">
            <div class="col-sm-6">
                <h5>Choice Marketing Partners © 2016</h5></div>
            <div class="col-sm-6 social-icons"><a href="https://www.facebook.com/pages/Choice-Marketing-Partners-LLC/221793854688554" target="_blank"><i class="fa fa-facebook"></i></a></div>
        </div>
    </div>
</footer> --}}

@include('layouts.modal')
@include('layouts.modal_layout')

<!-- JavaScripts -->
{{--<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.3/jquery.min.js" integrity="sha384-I6F5OKECLVtK/BL+8iSLDEHowSAfUo76ZL9+kGAgTRdiByINKJaqTPH/QVNS1VDb" crossorigin="anonymous"></script>--}}
<script src="{{url('js/jquery-3.1.1.min.js')}}"></script>
{{--<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>--}}
<script src="{{url('js/bootstrap.min.js')}}"></script>
<script src="{{url('js/bootstrap-confirmation.min.js')}}"></script>
<script src="{{url('js/config.js')}}"></script>
<script src="{{ url('js/all.js') }}"></script>
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

<script type="text/javascript">
    // opt-in to bootstrap tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });

    $(document).ready(function(){
        $('ul.nav li').on('click', function(){
            $('li').removeClass('active');
            $(this).addClass('active');
            $(this).find('navbar-title-text').removeClass('navbar-title-text');
        }).on('focusout', function(){
            if($(this).attr('id') !== 'Home'){
                $('li').removeClass('active');
                $(this).find('a').addClass('navbar-title-text');
            }
        });
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
            default:
                break;
        }
    })();

    function getModalForm(){
        var form = $('form');

        return {
            'name': form.find('sender-name').val(),
            'phone': form.find('sender-phone').val(),
            'email': form.find('sender-email').val(),
            'message': form.find('sender-msg').val()
        }
    }

    $(document).on('click', '#sender-btn', function(e){
        e.stopPropagation();
        var modalForm = getModalForm();

        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('#_token').val()
            },
            url: '/sendmodal',
            data: {
                'form': modalForm
            },
            method: 'POST',
            dataType: 'html'
        }).done(function(data){
            if(data){
                $('#modal-body').html(data.data);
            }
        });
    });

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

@yield('scripts')


</body>
</html>