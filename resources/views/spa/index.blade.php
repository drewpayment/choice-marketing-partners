@extends('spa.app', ['containerClass' => 'container-fluid'])

@section('title', 'Choice Marketing Partners')

@section('content')

<h1>Hello, world.</h1>
<p>
    I am {{ $user['name'] }}.
</p>

@endsection