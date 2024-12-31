export interface Wine {
    name: string;
    producer: string;
    region: string;
    year: number;
    price: number;
  }
  
  export interface WineList {
    blancos: Wine[];
    tintos: Wine[];
    espumosos: Wine[];
    rosados: Wine[];
    postres: Wine[];
  }
  
  export const wines: WineList = {
    blancos: [
      {
        name: "Chateau Chalon",
        producer: "Dme Marie-Chevassu",
        region: "Arbois, Francia",
        year: 1999,
        price: 280,
      },
      {
        name: "Condrieu, La Petite Cote",
        producer: "Yves Culleiron",
        region: "Francia",
        year: 2014,
        price: 360,
      },
      {
        name: "Viñedo Hirsch, Chardonnay",
        producer: "",
        region: "Sonoma, EE. UU.",
        year: 2013,
        price: 560,
      },
    ],
    tintos: [
      {
        name: "Chambolle Musigny",
        producer: "Fredric Magnien",
        region: "Francia",
        year: 2013,
        price: 460,
      },
      {
        name: "John Duval, Eligo Shiraz",
        producer: "",
        region: "Barossa, Australia",
        year: 2012,
        price: 560,
      },
      {
        name: "Amarone della Valpolicella",
        producer: "Bertani",
        region: "Veneto, Italia",
        year: 2007,
        price: 800,
      },
    ],
    espumosos: [
      {
        name: "Champagne Brut",
        producer: "Dom Pérignon",
        region: "Champagne, Francia",
        year: 2012,
        price: 890,
      },
      {
        name: "Prosecco Superiore",
        producer: "Cartizze",
        region: "Valdobbiadene, Italia",
        year: 2021,
        price: 320,
      },
    ],
    rosados: [
      {
        name: "Côtes de Provence",
        producer: "Château d'Esclans",
        region: "Provence, Francia",
        year: 2022,
        price: 280,
      },
      {
        name: "Bandol Rosé",
        producer: "Domaine Tempier",
        region: "Provence, Francia",
        year: 2021,
        price: 340,
      },
    ],
    postres: [
      {
        name: "Chateau d'Yquem",
        producer: "",
        region: "Sauternes, Francia",
        year: 1998,
        price: 600,
      },
      {
        name: "Vin Santo",
        producer: "Antinori",
        region: "Toscana, Italia",
        year: 2015,
        price: 420,
      },
    ],
  };
  
  