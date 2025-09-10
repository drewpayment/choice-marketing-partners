<!-- MODAL -->

<div class="modal fade" tabindex="-1" role="dialog" id="modal">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="modal-title"></h4>
            </div>
            <div class="modal-body">
                <form id="EMAIL_FORM">
                    <div class="form-group">
                        <label for="sender-name" class="control-label">Name: </label>
                        <input type="text" class="form-control" id="sender-name">
                    </div>
                    <div class="form-group">
                        <label for="sender-phone" class="control-label">Phone Number: </label>
                        <input type="tel" class="form-control" id="sender-phone">
                    </div>
                    <div class="form-group">
                        <label for="sender-email" class="control-label">Email: </label>
                        <input type="email" class="form-control" id="sender-email">
                    </div>
                    <div class="form-group">
                        <label for="sender-msg" class="control-label">Tell us a bit about yourself: </label>
                        <textarea class="form-control" id="sender-msg"></textarea>
                    </div>
                    {{csrf_field()}}
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="sender-btn">Submit</button>
            </div>
        </div><!-- /.modal-content -->
    </div><!-- /.modal-dialog -->
</div><!-- /.modal -->