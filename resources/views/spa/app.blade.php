<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta id="global-token" name="token" content="{{csrf_token()}}">
    <base href="/" />

    <title>@yield('title')</title>
    <!-- Fonts -->
{{--    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css" integrity="sha384-XdYbMnZ/QjLh6iI4ogqCTaIjrFk87ip+ekIjefZch0Y+PvJ8CDYtEs1ipDmPorQ+" crossorigin="anonymous">--}}
{{--    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lato:100,300,400,700">--}}
    <!-- Latest compiled and minified Bootstrap select/option module -->

    <!-- Slick Carousel http://kenwheeler.github.io/slick/ -->
{{--    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">--}}
    
    <!-- ANGULAR ASSETS -->
{{--    @foreach ($styles as $s)--}}
{{--    <link rel="styleshset" href="{{$s['path']}}" />--}}
{{--    @endforeach--}}
    
{{--    <script src="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.full.js"></script>--}}
</head>
<body>
    @yield('content')

    @auth
    @foreach ($file_paths as $fp)
    @if (strpos($fp, '2015') !== false)
    <script src="{{url($fp)}}" type="module"></script>
    @elseif (strpos($fp, 'es5') !== false)
    <script src="{{url($fp)}}" nomodule defer></script>
    @elseif (strpos($fp, '.map') === false)
    <script src="{{url($fp)}}" type="text/javascript"></script>
    @endif
    @endforeach
    @endauth

</body>
</html>