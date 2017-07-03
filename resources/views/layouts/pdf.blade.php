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
    {{-- <link href="{{ elixir('css/app.css') }}" rel="stylesheet"> --}}
    <link rel="stylesheet" href="{{url('css/bootstrap/bootstrap.css')}}">
    <link rel="stylesheet" href="{{url('css/ionicons/ionicons.min.css')}}">
    <link rel="stylesheet" href="{{url('css/user.css')}}">

    @yield('topCSS')

    <style>
        body {
            font-family: 'Lato';
        }
    </style>

    @yield('topJS')
</head>
<body id="app-layout">

<div class="site-content">

    <div class="container">
        @yield('content')
    </div>

</div>


</body>
</html>
