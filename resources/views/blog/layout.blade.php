<?php
    $container = isset($container) ? $container : 'container';
    $pageTitle = isset($pageTitle) ? $pageTitle.' - Choice Marketing' : 'Choice Marketing Partners';
?>

@extends('layouts.app', ['containerClass' => $container])

@section('title', $pageTitle)

@section('content')

    <div class="row">
        <div class="col-md-12">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h3 class="m-0">@yield('blog_title')</h3>
                </div>
                <div class="box-content">
                    @yield('title-meta')
                    @yield('blog-content')
                </div>
            </div>
        </div>
    </div>

@endsection