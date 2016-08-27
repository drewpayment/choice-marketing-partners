
@foreach($documents as $document)

    <a href="#" class="list-group-item">
        <h4 class="list-group-item-heading">{{$document->name}} <small>Document Owner: {{$document->uploaded_by}}</small></h4>
        <p class="list-group-item-text">{{$document->description}}</p>
    </a>

@endforeach




