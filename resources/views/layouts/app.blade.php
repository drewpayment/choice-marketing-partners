<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Choice Marketing Partners</title>

    <!-- Fonts -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css" integrity="sha384-XdYbMnZ/QjLh6iI4ogqCTaIjrFk87ip+ekIjefZch0Y+PvJ8CDYtEs1ipDmPorQ+" crossorigin="anonymous">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lato:100,300,400,700">

    <!-- Styles -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">
    {{-- <link href="{{ elixir('css/app.css') }}" rel="stylesheet"> --}}
    <link rel="stylesheet" href="{{url('css/app.css')}}" type="text/css">

    <link rel="stylesheet" href="{{url('css/ionicons/ionicons.min.css')}}">
    <link rel="stylesheet" href="{{url('css/user.css')}}">

    <style>
        body {
            font-family: 'Lato';
        }

        .fa-btn {
            margin-right: 6px;
        }
    </style>
</head>
<body id="app-layout">
    <nav class="navbar navbar-default">
        <div class="container">
            <div class="navbar-header"><a class="navbar-brand navbar-link" href="{{url('/')}}"><i class="glyphicon glyphicon-globe"></i>Choice Marketing Partners</a>
                <button class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navcol-1"><span class="sr-only">Toggle navigation</span><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></button>
            </div>
            <div class="collapse navbar-collapse" id="navcol-1">
                <ul class="nav navbar-nav navbar-right">
                    <li role="presentation" id="homeLink"><a href="{{url('/')}}">Home </a></li>
                    @if(!Auth::user())<li role="presentation" id="loginLink"><a href="{{url('/login')}}"><i class="icon ion-log-in"></i> Login </a></li>@endif
                    @if(Auth::user())<li role="presentation" id="logoutLink"><a href="{{action('LoginController@index')}}"><i class="fa icon ion-log-out"></i> Logout </a></li>@endif
                </ul>
            </div>
        </div>
    </nav>

    <div class="container-fluid">
        @yield('content')
    </div>


    <footer class="site-footer">
        <div class="container">
            <div class="row">
                <div class="col-sm-6">
                    <h5>Choice Marketing Partners © 2016</h5></div>
                <div class="col-sm-6 social-icons"><a href="https://www.facebook.com/pages/Choice-Marketing-Partners-LLC/221793854688554" target="_blank"><i class="fa fa-facebook"></i></a></div>
            </div>
        </div>
    </footer>

    <!-- MODAL -->

    <div class="modal fade" tabindex="-1" role="dialog" id="modal">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="modal-title"></h4>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="form-group">
                            <label for="sender-name" class="control-label">Name: </label>
                            <input type="text" class="form-control" id="sender-name">
                        </div>
                        <div class="form-group">
                            <label for="sender-phone" class="control-label">Phone Number: </label>
                            <input type="tel" class="form-control" id="sender-phone">
                        </div>
                        <div class="form-group">
                            <label for="sender-email" class="control-label">Email: </label>
                            <input type="email" class="form-control" id="sender-email">
                        </div>
                        <div class="form-group">
                            <label for="sender-msg" class="control-label">Tell us a bit about yourself: </label>
                            <textarea class="form-control" id="sender-msg"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="sender-btn">Submit</button>
                </div>
            </div><!-- /.modal-content -->
        </div><!-- /.modal-dialog -->
    </div><!-- /.modal -->



    <!-- JavaScripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.3/jquery.min.js" integrity="sha384-I6F5OKECLVtK/BL+8iSLDEHowSAfUo76ZL9+kGAgTRdiByINKJaqTPH/QVNS1VDb" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>
    {{-- <script src="{{ elixir('js/app.js') }}"></script> --}}

    <script type="text/javascript">
        $(document).ready(function(){
           $('ul.nav li').on('click', function(){
               $('li').removeClass('active');
               $(this).addClass('active');
           });
        });

        (function(){
            var currentPage = window.location.pathname;

            switch(currentPage){
                case "/":
                    $('#homeLink').addClass('active');
                    break;
                case "/login":
                    $('#loginLink').addClass('active');
                    break;
                default:
                    break;
            }
        })();

        $('#sender-btn').on('click', function(){
            var form = $('form').bind(document);
            var formData = new FormData();
            formData.append('Name', form.find('#sender-name').val());
            formData.append('PhoneNo', form.find('#sender-phone').val());
            formData.append('Email', form.find('#sender-email').val());
            formData.append('Message', form.find('#sender-msg').val());

            $.ajax({
                url: '/sendmodal',
                data: formData,
                method: 'POST',
                dataType: 'html'
            }).done(function(data){
                if(data){
                    $('#modal-body').html(data.data);
                }
            });
        })
    </script>

    @yield('scripts')

</body>
</html>
