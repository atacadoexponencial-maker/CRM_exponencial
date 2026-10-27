-- B44-07: o catálogo deixa de aceitar SVG (auditoria de 27/10/2026).
--
-- O bucket é público e o SVG pode trazer código que roda quando alguém abre o
-- endereço da imagem. Logo, banner e fotos ficam em JPG, PNG e WebP. O endereço de
-- envio assinado não amarra o tipo do arquivo, então a lista do bucket é a trava
-- de verdade. Logo SVG que já exista continua no ar; só o envio novo é recusado.

update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'catalog-images';
