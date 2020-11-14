@extends('dashboard.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('title', 'Document Manager')

@section('wrapper-title')
Document Manager
@endsection

@section('wrapper-content')
    
    <div class="row">
        <div class="col-md-12">
            <cp-document-list></cp-document-list>
        </div>
    </div>

@endsection
