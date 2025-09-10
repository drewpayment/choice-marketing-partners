<!-- MODAL -->

<div class="modal-dialog" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="modal-title">Document Uploader</h4>
        </div>
        <div class="modal-body">
            <div class="documentUploader">
                <div class="box box-default minh-220">
                    <div class="box-content">
                        <form id="dropzone-modal" class="dropzone dz-clickable" enctype="multipart/form-data">
                            <!-- HTML heavily inspired by http://blueimp.github.io/jQuery-File-Upload/ -->
                            {{--<div class="table table-striped files" id="previews">--}}
                                {{--<div id="template" class="file-row" style="display:none;">--}}
                                    {{--<!-- This is used as the file preview template -->--}}
                                    {{--<div>--}}
                                        {{--<span class="preview"><img data-dz-thumbnail /></span>--}}
                                    {{--</div>--}}
                                    {{--<div>--}}
                                        {{--<p class="name" data-dz-name></p>--}}
                                        {{--<strong class="error text-danger" data-dz-errormessage></strong>--}}
                                    {{--</div>--}}
                                    {{--<div>--}}
                                        {{--<p class="size" data-dz-size></p>--}}
                                        {{--<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">--}}
                                            {{--<div class="progress-bar progress-bar-success" style="width:0%;" data-dz-uploadprogress></div>--}}
                                        {{--</div>--}}
                                    {{--</div>--}}
                                {{--</div>--}}
                                {{--<div>--}}
                                    {{--<button id="clickable" class="btn btn-primary btn-block" type="button">--}}
                                        {{--<i class="fa fa-folder-open-o"></i>--}}
                                        {{--<span>Browse</span>--}}
                                    {{--</button>--}}
                                    {{--<button class="btn btn-success btn-block start">--}}
                                        {{--<i class="fa fa-cloud-upload"></i>--}}
                                        {{--<span>Start</span>--}}
                                    {{--</button>--}}
                                    {{--<button data-dz-remove class="btn btn-warning btn-block cancel">--}}
                                        {{--<i class="fa fa-remove"></i>--}}
                                        {{--<span>Cancel</span>--}}
                                    {{--</button>--}}
                                {{--</div>--}}
                            {{--</div>--}}

                            <input type="hidden" id="_token" name="_token" value="{{csrf_token()}}" />
                            <div class="form-group">
                                <label class="sr-only" for="name">Name </label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="name" name="name" placeholder="Document Name">
                                    <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="sr-only" for="description">Description </label>
                                <div class="input-group">
                                    <textarea class="form-control" id="description" name="description" placeholder="Document description. Please be as descriptive as possible so others will know what your document is used for." rows="2" cols="90" maxlength="160"></textarea>
                                    <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                                </div>
                            </div>

                            <div class="dz-message dropzone-previews" id="dropzone-previews">
                                <div class="h-100 dropzone-dragfield">
                                    <h4><i class="fa fa-hand-paper-o"></i> Drag & Drop here</h4>
                                    <h5 class="text-muted">(or click to browse)</h5>
                                </div>
                                <div id="template" style="display: none;">
                                    <div class="row">
                                        <div class="col-xs-3">
                                            <div class="dz-error-message"></div>
                                            <div class="dz-details">
                                                <img data-dz-thumbnail />
                                                <div class="dz-filename"><span data-dz-name></span></div>
                                            </div>
                                        </div>
                                        <div class="col-xs-9">
                                            <div class="dz-progress">
                                                <div class="text-center">
                                                    <h4>Upload Progress</h4>
                                                </div>
                                                <div class="progress progress-striped active">
                                                    <div class="progress-bar progress-bar-success" style="width:0;" data-dz-uploadprogress></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-success hidden" id="submitNewDocument"><i class="fa fa-upload"></i> Upload</button>
            <button type="button" class="btn btn-default" data-dismiss="modal"><i class="fa fa-times-circle-o"></i> Cancel</button>
        </div>
    </div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->
