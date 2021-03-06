
<div class="modal-dialog" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h3 class="modal-title" id="modal-title"><i class="fa fa-trash fa-fw"></i> Delete Agent</h3>
        </div>
        <div class="modal-body">
            <h4>Are you sure you want to delete this agent?</h4>
            <p><strong>Agent Name:</strong> {{$agent->name}}</p>
        </div>
        <div class="modal-footer" data-parent="true" data-parentid="{{$agent->id}}">
            <button type="button" class="btn btn-danger" id="confirm-submit">Delete</button>
            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
        </div>
    </div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->