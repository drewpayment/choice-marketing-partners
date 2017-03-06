
@foreach($documents as $document)

    <div class="list-group-item">
    	<ul class="list-unstyled list-inline">
    		<li>
		        <h4 class="list-group-item-heading">{{$document->name}} <small>Document Owner: {{$document->uploaded_by}}</small></h4>
		        <p class="list-group-item-text">{{$document->description}}</p>
			</li>
			<li class="pull-right pt-10">
				<ul class="list-unstyled list-inline">
					<li>
						<a href="{{ url('download', ['filename' => $document->file_path]) }}" class="unstyled">
							<i class="icon ion-ios-cloud-download-outline" style="font-size: 24px;"></i>
						</a>
					</li>
					@if($admin == 1)
					<li>
						<a href="{{ url('delete', ['id' => $document->id, 'filename' => $document->file_path]) }}" class="unstyled">
				    		<i class="icon ion-trash-a" style="font-size: 24px;"></i>
				    	</a>
					</li>
					@endif
				</ul>

		    </li>
    	</ul>
    </div>


@endforeach




