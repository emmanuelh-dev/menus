import enchiladas from "./media/enchiladas.jpg";
import flautas from "./media/flautas.jpg";
export const menuItems = [
    {
        title: "ENCHILADAS TRADICIONALES",
        subtitle: "Con o sin cebolla.",
        description: "Tortilla blanca o roja con chile colorado.",
        image: enchiladas,
        prices: ["24", "29"],
    },
    {
        title: "ENCHILADAS SUIZAS",
        description: "De pollo, incluye papa dorada.",
        image: flautas,
        prices: ["30"],
    },
    {
        title: "FLAUTAS",
        description: "Carne de res, pídalas crujientes o suaves.",
        image: flautas,
        prices: ["24", "29"],
    },
    {
        title: "ENTOMATADAS",
        description: "Con aguacate, papitas doradas, frijoles y crema.",
        subtitle: "De queso • De pollo",
        image: enchiladas,
        prices: ["20", "25"],
    },
    {
        title: "TACOS DE DESHEBRADA",
        description: "Dorados o suaves.",
        image: enchiladas,
        prices: ["22", "35"],
    },
    {
        title: "ENFRIJOLADAS",
        description: "Con aguacate, papitas doradas, crema y cebolla morada.",
        image: enchiladas,
        prices: ["35"],
    },
];

export const bottomSection = [
    {
        title: "Tacos enchilados",
        description:
            "Bañados de chile colorado dorados al comal, guiso a elegir y queso fundido.",
        image: enchiladas,
        price: "25",
    },
    {
        title: "Tostadas",
        description:
            "Cama de frijoles, guiso a elegir, lechuga, tomate, queso panela, aguacate y curitos.",
        image: enchiladas,
        price: "45",
    },
];

export const additionalItems = [
    {
        title: "Sopes",
        description:
            "Frijol, guiso a elegir, lechuga, crema, tomate y cebolla morada.",
        price: "35",
        priceLabel: "PIEZA",
    },
    {
        title: "Empanada dorada",
        description:
            "Rellena de queso y guiso a elegir, montada en cama de lechuga, bañada de guacamole, crema y cebolla morada.",
        price: "45",
        priceLabel: "PIEZA",
    },
    {
        title: "Gorditas de maíz",
        description: "Guiso a elegir, incluye papitas doradas.",
        price: "30",
        priceLabel: "PIEZA",
    },
    {
        title: "Tacos de Guisos",
        description: "Harina de maíz acompañados de verdura, limón y salsa.",
        price: "20",
        secondPrice: "35",
        priceLabel: "PIEZA",
    },
    {
        title: "Mega Burrito",
        description:
            "Frijoles, guiso a elegir, aguacate, lechuga y tomate. Incluye papitas doradas.",
        price: "90",
        priceLabel: "PIEZA",
    },
    {
        title: "Quesadillas estilo México",
        description:
            "Quesadilla 20 cm aprox. con queso Chihuahua y guiso elegir.",
        price: "70",
        priceLabel: "PIEZA",
    },
];

export const guisos = [
    "Picadillo",
    "Asado de boda",
    "Chicharrón en salsa verde",
    "Discada",
    "Papa con chorizo",
    "Tripita",
    "Nopalitos rojos",
    "Huitlacoche",
    "Deshebrada",
    "Raja con queso",
    "Huevo en salsa",
    "Nopalito con huevo",
    "Frijoles con queso",
    "Jamón con queso",
    "Queso fundido",
    "Pollo en mole",
    "Cochinita Pibil",
];