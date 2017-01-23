@extends('layouts.app')

@section('title', 'Document Manager')

@section('content')

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <div class="row">
                <div class="col-md-12">
                    <div class="addDocumentLink pt-30">
                        <a href="#" class="btn btn-primary">Add a document <i class="fa fa-plus-circle"></i></a>
                    </div>
                    <div class="documentUploader">
                        <form action="{{ url('/UploadDocument') }}" class="form-inline" method="POST" id="document_form" enctype="multipart/form-data">
                            <input type="hidden" id="_token" name="_token" value="{{csrf_token()}}" />
                            <h3>Document Uploader
                                <small>
                                    <a href="#" class="unstyled" id="hideDocUploader">
                                        <i class="fa fa-minus-circle"></i>
                                    </a>
                                </small>
                            </h3>
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

                            <br><br>

                            <div class="form-group">
                                <button type="submit" class="btn btn-primary">Upload Document</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <span class="pt-30">&nbsp;</span>
            <div class="list-group" id="document_list">
                @include('doc_manager._doc', array('documents' => $documents))
            </div>
        </div>
    </div>

@stop

@section('scripts')

    <script>

        $('.addDocumentLink').on('click', function(e){
            e.preventDefault();
            $(this).slideUp({
                duration: 'fast',
                easing: 'linear',
                done: function(){
                    $('.documentUploader').slideDown('fast');
                }
            });
        });

        $('#hideDocUploader').on('click', function(e){
            e.preventDefault();
            $(this).parent().parent().parent().parent().slideUp({
                duration: 'fast',
                easing: 'linear',
                done: function(){
                    $('.addDocumentLink').slideDown('fast');
                }
            })
        });

        {{--var file = null;--}}
        {{--$('#file_upload').on('change', prepUpload);--}}

        {{--function prepUpload(){--}}
            {{--file = $('#file_upload')[0];--}}
        {{--}--}}

        {{--$('form').submit(function(e){--}}
            {{--e.stopPropagation();--}}
            {{--e.preventDefault();--}}
            {{--$('.form-group').removeClass('has-error');--}}
            {{--$('.help-block').remove();--}}

            {{--var token = $('input[name="_token"]').val();--}}

            {{--var formData = [];--}}
            {{--formData["file"] = file;--}}
            {{--formData["name"] = $('#name').val();--}}
            {{--formData["description"] = $('#description').val();--}}

            {{--var name = $('#name').val();--}}
            {{--var description = $('#description').val();--}}

{{--//            var sendData = new FormData();--}}
{{--//            sendData.append('name', name);--}}
{{--//            sendData.append('file', file);--}}
{{--//            sendData.append('description', description);--}}


            {{--$.ajax({--}}
                {{--type: 'POST',--}}
                {{--url: '{{action('DocumentController@uploadFile')}}',--}}
                {{--headers: {--}}
                    {{--"X-CSRF-TOKEN": token--}}
                {{--},--}}
                {{--data: JSON.stringify(formData),--}}
                {{--dataType: 'json',--}}
                {{--processData: false,--}}
                {{--contentType: false,--}}
                {{--beforeSend: function(jqXHR, settings){--}}
                    {{--console.log(formData);--}}
                {{--}--}}
            {{--}).done(function(data){--}}
                {{--$('form').append('<div class="alert alert-success">'+data.message+'</div>');--}}

                {{--$.get('{{action('DocumentController@getDocumentsViaAjax')}}', function(){--}}
                    {{--var doc_list = $('#document_list');--}}
                    {{--doc_list.empty();--}}
                    {{--doc_list.append(data['html']);--}}
                {{--});--}}
            {{--}).fail(function(response){--}}
                {{--console.log(response.statusText);--}}

                {{--if(response.name){--}}
                    {{--docName.parent().addClass('has-error');--}}
                    {{--docName.parent().append('<div class="help-block">'+response.name+'</div>');--}}
                {{--}--}}
                {{--if(response.file){--}}
                    {{--fileName.parent().addClass('has-error');--}}
                    {{--fileName.parent().append('<div class="help-block">'+response.file+'</div>');--}}
                {{--}--}}
                {{--if(response.description){--}}
                    {{--docDesc.parent().addClass('has-error');--}}
                    {{--docDesc.parent().append('<div class="help-block">'+response.description+'</div>');--}}
                {{--}--}}
            {{--});--}}

        {{--});--}}
    </script>

@stop