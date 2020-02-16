{{--  params available  --}}
{{--    isAdmin,        --}}
{{--    isManager,      --}}
{{--    emps,           --}}
{{--    paystubs,       --}}
{{--    issueDates,     --}}
{{--    vendors,        --}}
{{--    rows,           --}}
{{--    overrides,      --}}
{{--    expenses        --}}

@extends('layouts.app')

@section('title', 'Paystubs')

@section('content')

<cp-paystubs-list
    [isAdmin]="{{ $isAdmin }}"
    [isManager]="{{ $isManager }}"
    [employees]="{{ $emps }}"
    [issueDates]="{{ $issueDates }}"
    [vendors]="{{ $vendors }}"
></cp-paystubs-list>

@endsection


{{--@section('scripts')

    <script src="{{elixir('js/views/paystubs/paystubs.js')}}"></script>

@endsection--}}