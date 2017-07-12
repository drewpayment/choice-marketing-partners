@extends('layouts.app')


@section('content')

    <div class="row">
        <div class="col-md-10">
            <div class="list-group">
                @foreach($documents as $d)
                    <div class="list-group-item">
                        <div class="list-group-item-heading">
                            {{$d['path']}}
                        </div>
                        {{$d['type']}}
                    </div>
                @endforeach
            </div>
        </div>
    </div>

@endsection