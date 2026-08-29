export interface CartLine {
  productId: string;
  name: string;
  unit: string;
  unitPrice: number;
  stock: number;
  quantity: number;
  discount: number;
  imageUrl: string | null;
}
