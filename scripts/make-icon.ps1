# Genera build/icon.ico (multi-tamaño) para Marcador Pro.
# Uso: powershell -File scripts/make-icon.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'build\icon.ico'
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null

$sizes = @(16, 24, 32, 48, 64, 128, 256)

function New-Bitmap($size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)

  $radius = [int]($size * 0.22)

  # --- Fondo redondeado (#0B0F14) ---
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $w = $size - 1
  $d = $radius * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($w - $d, 0, $d, $d, 270, 90)
  $path.AddArc($w - $d, $w - $d, $d, $d, 0, 90)
  $path.AddArc(0, $w - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 11, 15, 20))
  $g.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()

  # --- Texto "2:1" centrado (blanco #F8FAFC) ---
  $fontSize = [float]($size * 0.40)
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
  # Ligero desplazamiento para dejar sitio a la barra inferior
  $rect = New-Object System.Drawing.RectangleF(0, [float](-$size * 0.05), [float]$size, [float]$size)
  $g.DrawString('2:1', $font, $textBrush, $rect, $fmt)
  $textBrush.Dispose()
  $font.Dispose()
  $fmt.Dispose()

  # --- Barra de acento azul (#2563EB) solo en tamaños medianos/grandes ---
  if ($size -ge 32) {
    $barW = [int]($size * 0.52)
    $barH = [int]([Math]::Max(2, $size * 0.075))
    $barX = [int](($size - $barW) / 2)
    $barY = [int]($size * 0.74)
    $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
    $barPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $r = [int]($barH / 2)
    $barPath.AddArc($barX, $barY, $r * 2, $r * 2, 180, 90)
    $barPath.AddArc($barX + $barW - $r * 2, $barY, $r * 2, $r * 2, 270, 90)
    $barPath.AddArc($barX + $barW - $r * 2, $barY + $barH - $r * 2, $r * 2, $r * 2, 0, 90)
    $barPath.AddArc($barX, $barY + $barH - $r * 2, $r * 2, $r * 2, 90, 90)
    $barPath.CloseFigure()
    $g.FillPath($accent, $barPath)
    $accent.Dispose()
    $barPath.Dispose()
  }

  $g.Dispose()
  return $bmp
}

# --- Construir ICO (entradas PNG) ---
$streams = New-Object System.Collections.Generic.List[System.IO.MemoryStream]
foreach ($s in $sizes) {
  $b = New-Bitmap $s
  $ms = New-Object System.IO.MemoryStream
  $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
  $streams.Add($ms)
}

$fs = [System.IO.File]::Create($out)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0)          # reserved
$bw.Write([uint16]1)          # type: icon
$bw.Write([uint16]$sizes.Count)
$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]
  $data = $streams[$i].ToArray()
  $entrySize = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$entrySize) # width
  $bw.Write([byte]$entrySize) # height
  $bw.Write([byte]0)          # colors
  $bw.Write([byte]0)          # reserved
  $bw.Write([uint16]1)        # planes
  $bw.Write([uint16]32)       # bpp
  $bw.Write([uint32]$data.Length)
  $bw.Write([uint32]$offset)
  $offset += $data.Length
}
foreach ($ms in $streams) {
  $bw.Write($ms.ToArray())
  $ms.Dispose()
}
$bw.Dispose()
$fs.Dispose()

$info = Get-Item $out
"icon.ico generado: $($info.Length) bytes"
