export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  units: {
    code: string;
    available: boolean;
  }[];
}

export const mockItems: InventoryItem[] = [
  {
    id: "1",
    name: "Meta Quest 3",
    category: "Auriculares VR",
    description: "Casco de realidad virtual con seguimiento mixto. Ideal para proyectos de realidad aumentada y virtual.",
    imageUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400&h=300&fit=crop",
    units: [
      { code: "VR-001", available: true },
      { code: "VR-002", available: true },
      { code: "VR-003", available: false },
      { code: "VR-004", available: true },
      { code: "VR-005", available: false },
    ],
  },
  {
    id: "2",
    name: "MacBook Pro 14\"",
    category: "Electrónicos",
    description: "Laptop Apple con chip M3 Pro, 18GB RAM. Para desarrollo de software y diseño gráfico.",
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    units: [
      { code: "LAP-001", available: true },
      { code: "LAP-002", available: false },
      { code: "LAP-003", available: true },
    ],
  },
  {
    id: "3",
    name: "Canon EOS R6",
    category: "Cámaras",
    description: "Cámara mirrorless full-frame con grabación 4K 60fps. Perfecta para producción audiovisual.",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop",
    units: [
      { code: "CAM-001", available: true },
      { code: "CAM-002", available: true },
      { code: "CAM-003", available: true },
      { code: "CAM-004", available: false },
    ],
  },
  {
    id: "4",
    name: "Monitor Dell 27\" 4K",
    category: "Monitores",
    description: "Monitor UltraSharp 4K UHD con USB-C. Ideal para diseño y programación.",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop",
    units: [
      { code: "MON-001", available: false },
      { code: "MON-002", available: true },
      { code: "MON-003", available: true },
    ],
  },
  {
    id: "5",
    name: "Arduino Mega Kit",
    category: "Electrónicos",
    description: "Kit completo con placa Arduino Mega, sensores, actuadores y protoboard para proyectos IoT.",
    imageUrl: "https://images.unsplash.com/photo-1553406830-ef2f73f53946?w=400&h=300&fit=crop",
    units: [
      { code: "ARD-001", available: true },
      { code: "ARD-002", available: true },
      { code: "ARD-003", available: true },
      { code: "ARD-004", available: true },
      { code: "ARD-005", available: false },
      { code: "ARD-006", available: true },
    ],
  },
  {
    id: "6",
    name: "Trípode Manfrotto",
    category: "Accesorios",
    description: "Trípode profesional de fibra de carbono con cabezal fluido para video.",
    imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop",
    units: [
      { code: "TRI-001", available: true },
      { code: "TRI-002", available: false },
    ],
  },
  {
    id: "7",
    name: "Multímetro Fluke 87V",
    category: "Herramientas",
    description: "Multímetro digital industrial de alta precisión para laboratorio de electrónica.",
    imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop",
    units: [
      { code: "MUL-001", available: true },
      { code: "MUL-002", available: true },
      { code: "MUL-003", available: false },
      { code: "MUL-004", available: true },
    ],
  },
  {
    id: "8",
    name: "iPad Pro 12.9\"",
    category: "Electrónicos",
    description: "Tablet Apple con chip M2, Apple Pencil compatible. Para diseño y presentaciones.",
    imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop",
    units: [
      { code: "TAB-001", available: true },
      { code: "TAB-002", available: true },
      { code: "TAB-003", available: false },
    ],
  },
];
