@extends('layouts.app')

@section('title', 'Document Manager')

@section('content')

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <div class="row">
                <div class="col-xs-12">
                    <h2>Document Manager <small>View/Download Attachments on-the-go</small></h2>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    @if($admin == 1)
                    <div class="addDocumentLink pt-30">
                        <a href="#" class="btn btn-primary" id="addDocumentLink">Add a document <i class="fa fa-plus-circle"></i></a>
                    </div>
                    @endif
                </div>
            </div>
            <span class="pt-30">&nbsp;</span>
            <div class="list-group" id="document_list">
                @include('doc_manager._doc', array('documents' => $documents, 'admin' => $admin, 'tags' => $tags))
            </div>
        </div>
    </div>

@stop

@section('scripts')

    <script src="{{url('/js/selectize.js')}}"></script>
    <script>

        $('#addDocumentLink').on('click', function(){
            var options = {
                url: '/showNewDocumentModal',
                dataType: 'HTML',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                remoteModal(data, afterNewDocumentModalShow);
            }
        });

        function afterNewDocumentModalShow(){
            $('#submitNewDocument').on('click', function(e){
                e.stopImmediatePropagation();
                $('#document_form').submit();
                $('#modal_layout').hide();
            });
        }

        $('.list-group-item').hover(function(){
            $(this).find('.ion-trash-a').parent().fadeIn();
        }, function(){
            $(this).find('.ion-trash-a').parent().fadeOut();
        });

        $(document).ready(function() {
            var elemList = $('[data-tagtype="admin"]');
            var noEditElemList = $('[data-tagtype="user"]');
            var tags = [];
            var tagOptions = [];
            var selectedTags = JSON.parse('{!! json_encode($selected) !!}');

            @foreach($tags as $t)
            tags.push({
                slug: '{{$t->slug}}',
                name: '{{$t->name}}',
                count: '{{$t->count}}'
            });
            @endforeach

            for(var i = 0; i < tags.length; i++){
                var d = tags[i];
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