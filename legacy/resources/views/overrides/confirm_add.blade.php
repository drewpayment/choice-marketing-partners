
<div class="modal-dialog" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h3 class="modal-title" id="modal-title"><i class="fa fa-plus fa-fw"></i> Add Agent</h3>
        </div>
        <div class="modal-body">
            <h4>Would you like to add this agent?</h4>
            <p><strong>Agent Name:</strong> {{$agent->name}}</p>
        </div>
        <div class="modal-footer" data-parent="true" data-parentid="{{$agent->id}}">
            <button type="button" class="btn btn-primary" id="confirm-submit">Submit</button>
            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
        </div>
    </div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->