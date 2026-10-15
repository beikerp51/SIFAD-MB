# Servidor web HTTP simple para servir archivos estáticos de SIARAD-MB
# Corrección completa con validaciones de seguridad y mejor manejo de errores

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Output "Servidor SIARAD-MB iniciado en http://localhost:8080/"
Write-Output "Presiona Ctrl+C para detener el servidor"
Write-Output "----------------------------------------"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Obtener ruta solicitada
        $rawPath = $request.Url.LocalPath
        
        # Manejar ruta raíz
        if ($rawPath -eq "/" -or $rawPath -eq "") {
            $rawPath = "/index.html"
        }
        
        # Prevenir path traversal attacks
        $rawPath = $rawPath.Replace("..", "").Replace("//", "/")
        
        # Construir ruta física segura
        $basePath = $pwd.Path
        $filePath = Join-Path $basePath $rawPath.TrimStart('/')
        
        # Asegurar que el archivo está dentro del directorio base
        if (-not $filePath.StartsWith($basePath, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden: Acceso denegado")
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            $response.Close()
            continue
        }
        
        # Verificar si el archivo existe
        if (Test-Path $filePath -PathType Leaf) {
            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                # Determinar tipo MIME basado en extensión
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                switch ($extension) {
                    ".html" { $response.ContentType = "text/html; charset=utf-8" }
                    ".htm"  { $response.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $response.ContentType = "text/css" }
                    ".js"   { $response.ContentType = "application/javascript" }
                    ".json" { $response.ContentType = "application/json" }
                    ".png"  { $response.ContentType = "image/png" }
                    ".jpg"  { $response.ContentType = "image/jpeg" }
                    ".jpeg" { $response.ContentType = "image/jpeg" }
                    ".gif"  { $response.ContentType = "image/gif" }
                    ".svg"  { $response.ContentType = "image/svg+xml" }
                    ".pdf"  { $response.ContentType = "application/pdf" }
                    ".txt"  { $response.ContentType = "text/plain; charset=utf-8" }
                    ".ico"  { $response.ContentType = "image/x-icon" }
                    default { $response.ContentType = "application/octet-stream" }
                }
                
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                Write-Output "200 OK: $rawPath"
            } catch {
                $response.StatusCode = 500
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error: Error leyendo archivo")
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                Write-Output "500 Error: $rawPath - $_"
            }
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            Write-Output "404 Not Found: $rawPath"
        }
        
        $response.Close()
    }
} catch {
    Write-Output "Error en el servidor: $_"
} finally {
    if ($listener -ne $null) {
        $listener.Stop()
        $listener.Close()
        Write-Output "Servidor detenido"
    }
}