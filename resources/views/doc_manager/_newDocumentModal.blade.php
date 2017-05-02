<!-- MODAL -->

<div class="modal-dialog" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="modal-title">Document Uploader</h4>
        </div>
        <div class="modal-body">
            <div class="documentUploader">
                <form action="{{ url('/UploadDocument') }}" class="form-inline" method="POST" id="document_form" enctype="multipart/form-data">
                    <input type="hidden" id="_token" name="_token" value="{{csrf_token()}}" />

                    <div class="form-group">
                        <label class="sr-only" for="name">Name </label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="name" name="name" placeholder="Document Name">
                            <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                        </div>
                    </div>

                    <div class="form-group pl-30">
                        <label class="sr-only" for="file_upload">Filename </label>
                        <input type="file" class="form-control" id="file_upload" name="file_upload">
                    </div>

                    <br><br>

                    <div class="form-group">
                        <label class="sr-only" for="description">Description </label>
                        <div class="input-group">
                            <textarea class="form-control" id="description" name="description" placeholder="Document description. Please be as descriptive as possible so others will know what your document is used for." rows="2" cols="90" maxlength="160"></textarea>
                            <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            <button type="submit" class="btn btn-primary" id="submitNewDocument">Submit</button>
        </div>
    </div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->
