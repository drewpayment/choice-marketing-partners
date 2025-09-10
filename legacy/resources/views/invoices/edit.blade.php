@extends('layouts.app')

@section('title', 'Edit Invoice')

@section('content')

    <cp-create-invoice data="{{$data}}"></cp-create-invoice>

@endsection
