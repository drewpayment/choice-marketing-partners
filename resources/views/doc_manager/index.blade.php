@extends('layouts.app')

@section('title', 'Document Manager')

@section('content')

    <div class="container">
        <div class="row">
            <div class="col-md-10 col-md-offset-1">
                <div class="row">
                    <div class="col-md-12">
                        <div class="addDocumentLink">
                            <a href="#" class="unstyled">Add a document <i class="fa fa-plus-circle"></i></a>
                        </div>
                        <div class="documentUploader">
                            {!! Form::open(array('action'=>'DocumentController@uploadFile','method'=>'POST','files'=>true,'class'=>'form-inline', 'id'=>'document_form')) !!}
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
                                        <input type="text" class="form-control" id="name" placeholder="Document Name">
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
                                        <textarea class="form-control" id="description" placeholder="Document description. Please be as descriptive as possible so others will know what your document is used for." rows="2" cols="90" maxlength="160"></textarea>
                                        <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                                    </div>
                                </div>

                                <br><br>

                                <div class="form-group">
                                    <button type="submit" class="btn btn-default">Upload Document</button>
                                </div>
                            {!! Form::close() !!}
                        </div>
                    </div>
                </div>
                <span class="pt-30">&nbsp;</span>
                <div class="list-group" id="document_list">
                    @include('doc_manager._doc', array('documents' => $documents))
                </div>
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

        $('form').submit(function(e){
            e.preventDefault();
            $('.form-group').removeClass('has-error');
            $('.help-block').remove();

            var formData = new FormData();
            formData.append('file', input.files[0]);
            formData['_token'] = $(this)[0].defaultValue;
            formData['name'] = $('#name').val();
            var file = $('#file_upload').file[0];
            if(file) {
                var reader = new FileReader();
                reader.readAsText(file);
                reader.onload = function(e){
                    alert(e.target.result);
                }
            }
            formData['file_upload'] = file;
            formData['description'] = $('#description').val();

            console.log(formData);

            $.ajax({
                type: 'POST',
                url: '{{action('DocumentController@uploadFile')}}',
                data: formData,
                processData: false,
                contentType: 'multipart/form-data',
                mimeType: 'multipart/form-data'
            }).done(function(data){
                $('form').append('<div class="alert alert-success">'+data.message+'</div>');

                $.get('{{action('DocumentController@getDocumentsViaAjax')}}', function(){
                    var doc_list = $('#document_list');
                    doc_list.empty();
                    doc_list.append(data['html']);
                });
            }).fail(function(response){
                console.log(response);

                if(response.name){
                    docName.parent().addClass('has-error');
                    docName.parent().append('<div class="help-block">'+response.name+'</div>');
                }
                if(response.file){
                    fileName.parent().addClass('has-error');
                    fileName.parent().append('<div class="help-block">'+response.file+'</div>');
                }
                if(response.description){
                    docDesc.parent().addClass('has-error');
                    docDesc.parent().append('<div class="help-block">'+response.description+'</div>');
                }
            });

        });
    </script>

@stop