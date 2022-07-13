foreach ($file in Get-ChildItem .\*) {
    $FilePath = Join-Path -Path ./ -ChildPath $file.Name
    $target = get-item $FilePath
    if($target.PSIsContainer) {
        echo $FilePath
        git add $FilePath
        git commit -m "add $FilePath files"
    }
}