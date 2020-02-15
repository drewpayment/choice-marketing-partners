<?php

namespace App\Plugins;

use Mpdf\Mpdf;

class PDF 
{
    protected $mPdf;

    public function __construct()
    {
        $this->mPdf = new Mpdf(['utf-8', 'A4', '0', '0', 0, 0, 0, 0, 0, 0]);
        $this->mPdf->SetDisplayMode('fullpage');
        $this->mPdf->list_indent_first_level = 0;
    }

    public function loadView($view, $data)
    {
        $this->mPdf->WriteHTML(view($view, $data)->render());
        return $this;
    }

    public function stream($name = 'invoice.pdf')
    {
        return response($this->mPdf->Output($name, 'S'), 200, [
            'Content-Type' => 'application/pdf'
        ]);
    }

    public function download($name = 'invoice.pdf')
    {
        return $this->mPdf->Output($name, 'D');
    }

    public function save($path)
    {
        $this->mPdf->Output($path, 'F');
        return $path;
    }

    public function loadHtml($html)
    {
        $this->mPdf->WriteHTML($html);
        return $this;
    }

    public function __call($method, $args)
    {
        call_user_func_array([$this->mPdf, $method], $args);
    }
}