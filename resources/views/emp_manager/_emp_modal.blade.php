
<div class="modal-dialog" role="document">
	<div class="modal-content">
	  <div class="modal-header">
	    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
	    <h4 class="modal-title">Edit Employee</h4>
	  </div>
	  <div class="modal-body">
	    <form id="emp_id" data-parentid="{{$emp[0]->id}}">
	    	<input type="hidden" data-token="true" value="{{ csrf_token() }}">
	    	<div class="form-group">
	    		<label for="emp_name">Name</label>
	    		<input type="text" class="form-control" id="emp_name" name="emp_name" value="{{ $emp[0]->name }}" placeholder="Employee Name">
	    	</div>
	    	<div class="form-group">
				<label for="emp_email">Email</label>
				<input type="email" class="form-control" id="emp_email" name="emp_email" value="{{ $emp[0]->email }}" placeholder="Email">
	    	</div>
	    	<div class="form-group">
	    		<label for="emp_phone">Phone Number</label>
	    		<input type="number" class="form-control" id="emp_phone" name="emp_phone" value="{{ $emp[0]->phone_no }}" placeholder="Phone Number">
	    	</div>
	    	<div class="form-group">
	    		<label for="emp_active">
					Active <input type="checkbox" class="form-control" id="emp_active" name="emp_active" @if($emp[0]->is_active == 1) checked @endif />
				</label>
	    		{{--@if($emp[0]->is_active == 1)--}}
    			{{--@else--}}
					{{--<input type="checkbox" class="form-control" id="emp_active" name="emp_active">--}}
				{{--@endif--}}
    		</div>
    		<div class="form-group">
				<label for="emp_address">Address</label>
				<input type="text" class="form-control" id="emp_address" name="emp_address" value="{{ $emp[0]->address }}">
    		</div>
	    </form>
	  </div>
	  <div class="modal-footer">
	    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
	    <button type="button" class="btn btn-primary" data-tag="4" data-vero="button">Save changes</button>
	  </div>
	</div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->