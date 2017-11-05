@extends('layouts.app')

@section('title', 'Document Manager')

@section('content')

    <div class="row">
        <div class="col-xs-12">
            <h2>Document Manager <small>View/Download Attachments on-the-go</small></h2>
        </div>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="panel panel-primary">
                <div class="panel-heading">Filter documents by tag</div>
                <div class="panel-body p-0 h-40">
                    <ol class="breadcrumb">
                        @foreach($uTags as $t)
                            <li>
                                <button type="button" class="btn btn-primary btn-xs" data-button="tag" data-slug="{{$t->slug}}" data-count="{{$t->count}}" data-name="{{$t->name}}">{{$t->name}}</button>
                            </li>
                        @endforeach
                    </ol>
                </div>
            </div>
        </div>
    </div>
    @if($admin == 1)
        <div class="row">
            <div class="col-md-12">
                <div class="addDocumentLink">
                    <a href="#" class="btn btn-primary btn-block" id="addDocumentLink">Add a document <i class="fa fa-plus-circle"></i></a>
                </div>
            </div>
        </div>
    @endif
    <span class="pt-30">&nbsp;</span>
    <div class="list-group" id="document_list">
        @include('doc_manager._doc', ['documents' => $documents, 'admin' => $admin, 'tags' => $tags])
    </div>

@stop

@section('scripts')

    <script src="{{url('/js/dropzone.js')}}"></script>
    <script>
        // disable autodiscover
        Dropzone.autoDiscover = false;
        var that;


        $('[data-button="tag"]').on('click', function(){
            $(this).toggleClass('active');
            var activeTags = $(this).closest('.breadcrumb').find('.active');
            var tags = [];

            $.each(activeTags, function(idx, obj){
                 tags.push($(obj).data('slug'));
            });

            var options = {
                url: '/returnDocumentsByTag',
                type: 'POST',
                data: {
                    tags: tags
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                $('#document_list').html(data[0]);

                wireUpTagging(data[1], data[2]);
            }
        });

        $('#addDocumentLink').on('click', function(){
            var options = {
                url: '/showNewDocumentModal',
                dataType: 'HTML',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                $('#modal_layout').on('shown.bs.modal', function(){
                    var previewNode = document.querySelector('#template');
                    var previewTemplate = document.createElement('div').appendChild(previewNode);
                    previewTemplate.id = "";
                    $('#template').remove();

                    Dropzone.options.dropzoneModal = {
                        url: '{{url('/UploadDocument')}}',
                        paramName: 'file',
                        clickable: '#dropzone-previews',
                        maxFileSize: 2,
                        previewsContainer: '#dropzone-previews',
                        previewTemplate: previewTemplate.innerHTML,
                        thumbnailHeight: 100,
                        maxFiles: 1,
                        autoProcessQueue: false,
                        addRemoveLinks: true,
                        dictRemoveFile: '<i class="fa fa-times-circle"></i> Remove',
                        init: function(){
                            that = this;

                            this.on('maxfilesreached', function(){
                                this.removeEventListeners();

                                $('a.dz-remove').on('click', function(){
                                    $('.h-100').show();
                                    that.setupEventListeners();
                                });
                            });

                            this.on('addedfile', function(){
                                $('.h-100').hide();
                                $('#submitNewDocument').removeClass('hidden').on('click', function(e){
                                    e.preventDefault();

                                    Dropzone.forElement('#dropzone-modal').processQueue();
                                    $('.dz-hidden-input').prop('disabled', true);
                                });
                            });

                            this.on('sending', function(file, xhr, formData){
                                var elem = $('#dropzone-modal');
                                var inputList = elem.find('input');
                                var token = "";
                                $.each(inputList, function(idx, obj){
                                    if($(obj).attr('name') == '_token'){
                                        token = $(obj).val();
                                    } else if ($(obj).attr('name') == 'file'){
                                        formData.append('file', file);
                                    } else {
                                        formData.append($(obj).attr('name'), $(obj).val());
                                    }
                                });
                                xhr.setRequestHeader('X-CSRF-TOKEN', token);
                            });

                            this.on('complete', function(file){
                                var msg;
                                if(file.status == 'success'){
                                    $('.dz-remove').hide();
                                    msg = file.name + ' was uploaded successfully!';
                                    setMessageContainer(msg, null);

                                    setTimeout(function(){

                                        $('#submitNewDocument').addClass('hidden');
                                        $('.h-100').show();
                                        $('#name').val('');
                                        $('#description').val('');
                                        that.removeAllFiles(true);
                                        that.setupEventListeners();
                                        $('.dz-hidden-input').prop('disabled', false);
                                    }, 1000);

                                } else if(file.status == 'canceled') {

                                    msg = file.name + ' upload canceled.';
                                    setMessageContainer(msg, null, 'info');
                                } else {
                                    msg = file.name + ' upload failed! Please try again. If the problem persists, please contact your admin.';
                                    setMessageContainer(msg, null, 'danger');
                                }
                            });
                        }
                    };

                    $('#dropzone-modal').dropzone();
                }).on('hidden.bs.modal', function(){
                    that.destroy();
                    $('#modal_layout').html('');
                });
                remoteModal(data, afterNewDocumentModalShow);
            }
        });

        function afterNewDocumentModalShow(){
        }

        $('.list-group-item').hover(function(){
            $(this).find('.ion-trash-a').parent().fadeIn();
        }, function(){
            $(this).find('.ion-trash-a').parent().fadeOut();
        });

        var wireUpTagging = function(tags, selectedTags){
            var elemList = $('[data-tagtype="admin"]');
            var noEditElemList = $('[data-tagtype="user"]');
            var tagOptions = [], d;

            for(var i = 0; i < tags.length; i++){
                d = tags[i];
                tagOptions.push({tag: d.name});
            }

            if(elemList.length > 0){
                $.each(elemList, function(idx, obj){
                    var elem = $(obj);
                    var id = elem.closest('[data-parent="true"]').data('parentid');
                    var elemTags = [];

                    for(var i = 0; i < selectedTags.length; i++){
                        var item = selectedTags[i];
                        if(item.docId == id){
                            elemTags = item.tags;
                        }
                    }

                    elem.selectize({
                        plugins: ['remove_button'],
                        delimiter: ',',
                        persist: true,
                        maxItems: 2,
                        valueField: 'tag',
                        labelField: 'tag',
                        searchField: 'tag',
                        options: tagOptions,
                        items: elemTags,
                        create: function(value){
                            return {
                                tag: value
                            }
                        },
                        onOptionAdd: function(value, data){
                            handleCreateDocumentTag(data, elem);
                        },
                        onItemAdd: function(value, data){
                            handleTagDocument(value, data);
                        },
                        onItemRemove: function(value){
                            handleUntagDocument(value, elem);
                        }
                    });
                });
            } else if(noEditElemList.length > 0){
                $.each(noEditElemList, function(idx, obj){
                    var noEditElem = $(obj);
                    var id = noEditElem.closest('[data-parent="true"]').data('parentid');
                    var elemTags = [];

                    for(var i = 0; i < selectedTags.length; i++){
                        var item = selectedTags[i];
                        if(item.docId == id){
                            elemTags = item.tags;
                        }
                    }

                    noEditElem.selectize({
                        plugins: ['remove_button'],
                        delimiter: ',',
                        persist: false,
                        maxItems: 2,
                        valueField: 'tag',
                        labelField: 'tag',
                        searchField: 'tag',
                        options: tags,
                        items: elemTags,
                        create: false,
                        onItemAdd: function(value, data){
                            handleTagDocument(value, data);
                        },
                        onItemRemove: function(value){
                            handleUntagDocument(value, noEditElem);
                        }
                    });
                });
            }
        };

        $(document).ready(function() {
            var tags = [];
            var selectedTags = JSON.parse('{!! json_encode($selected) !!}');

            @foreach($tags as $t)
            tags.push({
                slug: '{{$t->slug}}',
                name: '{{$t->name}}',
                count: '{{$t->count}}'
            });
            @endforeach

            wireUpTagging(tags, selectedTags);
        });

        var handleTagDocument = function(tag, elem){
            var docId = $(elem).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/tagDocument',
                type: 'POST',
                data: {
                    docId: docId,
                    tag: tag
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
                setMessageContainer(data);
            }
        };

        var handleUntagDocument = function(tag, elem){
            var docId = $(elem).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/untagDocument',
                type: 'POST',
                data: {
                    docId: docId,
                    tag: tag
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
                setMessageContainer(data);
            }
        };

        var handleCreateDocumentTag = function(tagData, elem){
            var docId = $(elem).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/createTag',
                type: 'POST',
                data: {
                    docId: docId,
                    tagOrder: tagData.$order,
                    tagName: tagData.tag
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
                setMessageContainer(data);
            }
        };
    </script>

@stop