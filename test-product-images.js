// Script para probar la API de productos y ver las imágenes
const testProductImages = async () => {
  try {
    const response = await fetch('https://4pvxg2nvf4.execute-api.us-east-1.amazonaws.com/prod/products');
    const data = await response.json();
    
    console.log('Total productos:', data.products.length);
    
    // Buscar productos con múltiples imágenes
    const productsWithMultipleImages = data.products.filter(p => 
      p.images && Array.isArray(p.images) && p.images.length > 1
    );
    
    console.log('Productos con múltiples imágenes:', productsWithMultipleImages.length);
    
    if (productsWithMultipleImages.length > 0) {
      console.log('Primer producto con múltiples imágenes:');
      console.log(JSON.stringify(productsWithMultipleImages[0], null, 2));
    }
    
    // Mostrar todos los productos y sus imágenes
    data.products.forEach((product, index) => {
      console.log(`\nProducto ${index + 1}: ${product.name}`);
      console.log('imageUrl:', product.imageUrl);
      console.log('images:', product.images);
      if (product.images) {
        console.log('Número de imágenes:', product.images.length);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
};

// Ejecutar en la consola del navegador
testProductImages();