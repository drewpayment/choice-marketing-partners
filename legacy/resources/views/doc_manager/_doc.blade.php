
@foreach($documents as $document)

	<div class="list-group-item" data-parent="true" data-parentid="{{$document->id}}">
        <div class="list-group-item-heading">
            <h4 class="display-inline">
                {{$document->name}}
                <small>Owner: {{$document->uploaded_by}}</small>
            </h4>
            <div class="display-inline pull-right">
                <a href="{{url('download', ['filename' => $document->file_path])}}" target="_blank" class="btn btn-default btn-sm">
                    <i class="fa fa-cloud-download"></i> Download
                </a>
                @if($admin == 1)
                    <a href="{{url('delete', ['id' => $document->id, 'filename' => $document->file_path])}}" class="btn btn-danger btn-sm">
                        <i class="fa fa-trash"></i> Delete
                    </a>
                @endif
            </div>
        </div>
        <div class="list-group-item-text">
            <div>
                @if($admin == 1)
                    <input id="input-tags" data-tagtype="admin" type="text" data-docid="{{$document->id}}" placeholder="Click to add Tags" />
                @else
                    <input id="tags-noedit" data-tagtype="user" type="text" readonly/>
                @endif
            </div>
            @if(strlen($document->description) > 0)
                <div class="box box-default">
                    <div class="box-title pb-0">
                        <h5 class="m-0 b-b">Description</h5>
                    </div>
                    <div class="box-content">
                        {{$document->description}}
                    </div>
                </div>
            @endif
        </div>
    </div>

@endforeach




