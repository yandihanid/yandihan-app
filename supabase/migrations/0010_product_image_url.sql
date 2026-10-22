-- 0010_product_image_url.sql
-- Menambahkan kolom image_url pada tabel products untuk menampilkan foto produk di kasir

alter table public.products add column if not exists image_url text;
