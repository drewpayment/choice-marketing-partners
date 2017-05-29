
@foreach($documents as $document)

    <div class="list-group-item">
    	<ul class="list-inline list-unstyled" style="display:inline;">
    		<li>
		        <ul class="list-unstyled" data-parent="true" data-parentid="{{$document->id}}">
					<li>
						<h3 class="list-group-item-heading">
							<a href="{{ url('download', ['filename' => $document->file_path]) }}" target="_blank">{{$document->name}}</a>
							<small>
								@if($admin == 1)
									<a href="{{ url('delete', ['id' => $document->id, 'filename' => $document->file_path]) }}" class="unstyled" style="display: none;">
										<i class="icon ion-trash-a" style="font-size: 24px;"></i>
									</a>
								@endif
							</small>
						</h3>
					</li>
					<li>
						<h5 class="list-group-item-text">{{$document->description}}</h5>
					</li>
					<li class="w-600 pt-10">
						@if($admin == 1)
						<input id="input-tags" data-tagtype="admin" type="text" data-docid="{{$document->id}}" placeholder="Click to add Tags" />
						@else
						<input id="tags-noedit" data-tagtype="user" type="text" readonly/>
						@endif
					</li>
				</ul>
			</li>
			<li class="pull-right">
				<ul class="list-unstyled">
					<li>

					</li>
				</ul>
		    </li>
    	</ul>
		<h5 class="text-muted pull-right" style="display:inline;">Owner: {{$document->uploaded_by}}</h5>
    </div>


@endforeach




