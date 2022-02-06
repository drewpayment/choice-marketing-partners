@extends('dashboard.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('title', 'Overrides')

@section('wrapper-title', 'Overrides')

@section('wrapper-content')

<div class="row">
  <div class="col-md-12">
    <cp-managers></cp-managers>
  </div>
</div>

@endsection
