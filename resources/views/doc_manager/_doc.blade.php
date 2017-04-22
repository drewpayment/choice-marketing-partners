
@foreach($documents as $document)

    <div class="list-group-item">
    	<ul class="list-inline list-unstyled">
    		<li>
		        <ul class="list-unstyled">
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
						<input id="input-tags" type="text" placeholder="Categories" />
					</li>
				</ul>
			</li>
			<li class="pull-right">
				<ul class="list-unstyled">
					<li>
						<h5 class="text-muted">Owner: {{$document->uploaded_by}}</h5>
					</li>
				</ul>
		    </li>
    	</ul>
    </div>


@endforeach




