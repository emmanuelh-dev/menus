import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import WhatsappButton from "./WhatsappButton";
import RecommendationButton from "./RecommendationButton";

interface MenuLoaderProps {
  menuSlug: string;
  categoryColors?: string[];
  whatsappPhone?: number;
  restaurantName: string;
  layout?: "simple" | "cards" | "list";
  restaurantType?: string;
  showWhatsApp?: boolean;
  showRecommendation?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

interface MenuItem {
  id: number;
  name: string;
  base_price?: number;
  description?: string;
  image?: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  is_spicy?: boolean;
  is_featured?: boolean;
  allergens?: string;
  ingredients?: string;
  calories?: number;
  preparation_time?: number;
  is_active: boolean;
  display_order: number;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  menu_items?: MenuItem[];
}

export default function MenuLoader({
  menuSlug,
  categoryColors = [
    "text-orange-500",
    "text-cyan-400",
    "text-red-500",
    "text-purple-500",
    "text-green-400",
    "text-pink-400",
    "text-blue-500",
    "text-yellow-500",
    "text-black -500",
    "text-teal-500"
  ],
  whatsappPhone,
  restaurantName,
  layout = "simple",
  restaurantType = "restaurant",
  showWhatsApp = true,
  showRecommendation = true,
  backgroundColor = "bg-white",
  textColor = "text-gray-900"
}: MenuLoaderProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    loadMenuData();
  }, [menuSlug]);

  async function loadMenuData() {
    try {
      setIsLoading(true);

      const { data: restaurant, error: restaurantError } = await supabase
        .from("places")
        .select("*")
        .eq("menu", menuSlug)
        .single();

      if (restaurantError) throw restaurantError;
      if (!restaurant) throw new Error("Restaurante no encontrado");

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select(`
          *,
          menu_items (
            *
          )
        `)
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);
      setError(null);
    } catch (err) {
      console.error("Error cargando menú:", err);
      setError("Error al cargar el menú");
    } finally {
      setIsLoading(false);
    }
  }

  function openImageModal(src: string, alt: string) {
    setModalImage({ src, alt });
    document.body.style.overflow = "hidden";
  }

  function closeImageModal() {
    setModalImage(null);
    document.body.style.overflow = "auto";
  }

  const menuItemsForAI = categories?.flatMap((category, categoryIndex) => {
    const categoryItem = {
      name: category.name.toUpperCase(),
      category: true,
      color: categoryColors[categoryIndex % categoryColors.length],
      description: category.description
    };

    const items = category.menu_items
      ?.filter((item: MenuItem) => item.is_active)
      ?.sort((a: MenuItem, b: MenuItem) => a.display_order - b.display_order)
      ?.map((item: MenuItem) => ({
        name: item.name,
        price: item.base_price,
        color: "text-white",
        description: item.description,
        category: false,
        is_vegetarian: item.is_vegetarian,
        is_vegan: item.is_vegan,
        is_gluten_free: item.is_gluten_free,
        is_spicy: item.is_spicy,
        allergens: item.allergens ? [item.allergens] : [],
        ingredients: item.ingredients ? [item.ingredients] : []
      })) || [];

    return [categoryItem, ...items];
  }) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className={`${textColor} text-xl`}>Cargando menú...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <>
      {modalImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-[90%] max-h-[90%]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeImageModal}
              className="absolute -top-10 right-0 text-white text-3xl font-bold bg-black/50 w-10 h-10 rounded-full hover:bg-black/80 transition-colors"
            >
              ×
            </button>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {layout === "simple" && (
        <div className="space-y-6 mb-8">
          {categories.map((category, categoryIndex) => (
            <div key={category.id}>
              <div className="mt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`${categoryColors[categoryIndex % categoryColors.length]} text-xl font-bold font-medium tracking-wide`}>
                        {category.name.toUpperCase()}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-gray-400 text-sm mt-1">{category.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {category.menu_items
                ?.filter((item: MenuItem) => item.is_active)
                ?.sort((a: MenuItem, b: MenuItem) => a.display_order - b.display_order)
                ?.map((item: MenuItem) => (
                  <div key={item.id} className="px-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-lg font-medium tracking-wide">
                            {item.name}
                          </span>
                          <div className="flex gap-1">
                            {item.is_vegetarian && (
                              <span className="text-green-400 text-xs" title="Vegetariano">🌱</span>
                            )}
                            {item.is_vegan && (
                              <span className="text-green-500 text-xs" title="Vegano">🌿</span>
                            )}
                            {item.is_gluten_free && (
                              <span className="text-blue-400 text-xs" title="Sin Gluten">🚫🌾</span>
                            )}
                            {item.is_spicy && (
                              <span className="text-red-400 text-xs" title="Picante">🌶️</span>
                            )}
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                        )}
                        {item.ingredients && (
                          <p className="text-gray-500 text-xs mt-1">
                            Ingredientes: {item.ingredients}
                          </p>
                        )}
                        {item.allergens && (
                          <p className="text-orange-400 text-xs mt-1">
                            ⚠️ Contiene: {item.allergens}
                          </p>
                        )}
                      </div>
                      <span className="text-yellow-400 text-xl font-bold ml-4">
                        {item.base_price ? `$${item.base_price}` : null}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {layout === "cards" && (
        <div className={`${backgroundColor} space-y-8 py-8`}>
          {categories.map((category, categoryIndex) => (
            <div key={category.id} className="max-w-6xl mx-auto lg:px-4">
              {category.image && (!category.menu_items || category.menu_items.length === 0) && (
                <div className="mb-8">
                  <h3 className="text-3xl font-bold mb-4 text-center text-gray-900">
                    {category.name}
                  </h3>
                  <div className="w-full">
                    <img
                      src={category.image}
                      alt={`Menú ${category.name}`}
                      className="w-full h-auto md:rounded-lg  cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openImageModal(category.image!, `Menú ${category.name}`)}
                    />
                  </div>
                </div>
              )}

              {category.menu_items && category.menu_items.length > 0 && (
                <div className="mb-12 px-4 max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h3 className={`text-4xl font-extrabold mb-2 ${restaurantType === "cafeteria" ? "text-amber-800" : "text-gray-900"}`}>
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        {category.description}
                      </p>
                    )}
                  </div>

                  {category.image && (
                    <div className="mb-8">
                      <img
                        src={category.image}
                        alt={`Categoría ${category.name}`}
                        className="w-full h-64 object-cover rounded-lg  cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal(category.image!, `Categoría ${category.name}`)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurantType !== "cafeteria" &&
                      category.menu_items
                        .filter((item) => item.is_active)
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((item) => (
                          <div key={item.id} className="bg-white rounded-xl  hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105">
                            {item.image && (
                              <div className="h-64 overflow-hidden relative">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                                  onClick={() => openImageModal(item.image!, item.name)}
                                />
                                {item.is_featured && (
                                  <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold ">
                                    ⭐ Destacado
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="p-2">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-xl font-bold text-gray-900 flex-1 pr-2">
                                  {item.name}
                                </h4>
                                <div className="text-right">
                                  <span className="text-2xl font-bold text-amber-700">
                                    ${item.base_price}
                                  </span>
                                </div>
                              </div>

                              {item.description && (
                                <p className="text-gray-600 text-sm line-clamp-3">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.is_spicy && (
                                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold">
                                    🌶️ Picante
                                  </span>
                                )}
                                {item.is_vegan && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                                    🌱 Vegano
                                  </span>
                                )}
                                {item.is_vegetarian && !item.is_vegan && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                                    🥬 Vegetariano
                                  </span>
                                )}
                                {item.is_gluten_free && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
                                    🌾 Sin Gluten
                                  </span>
                                )}
                              </div>

                              {(item.calories || item.preparation_time) && (
                                <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                                  {item.calories && (
                                    <span>🔥 {item.calories} cal</span>
                                  )}
                                  {item.preparation_time && (
                                    <span>⏱️ {item.preparation_time} min</span>
                                  )}
                                </div>
                              )}

                              {item.ingredients && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs text-gray-500">
                                    <strong>Ingredientes:</strong> {item.ingredients}
                                  </p>
                                </div>
                              )}

                              {item.allergens && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                  <p className="text-yellow-800">
                                    <strong>⚠️ Alérgenos:</strong> {item.allergens}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {layout === "list" && (
        <div className="space-y-8 py-8">
          {categories.map((category, categoryIndex) => (
            <div key={category.id} className="mb-12 px-4 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h3 className={`text-4xl font-extrabold mb-2 ${restaurantType === "cafeteria" ? "text-amber-800" : textColor}`}>
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    {category.description}
                  </p>
                )}
              </div>

              <div className="grid gap-6">
                {category.menu_items
                  ?.filter((item) => item.is_active)
                  ?.sort((a, b) => a.display_order - b.display_order)
                  ?.map((item) => (
                    <div key={item.id} className="mb-2 flex justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-black mb-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.base_price && (
                        <p className="font-medium">${item.base_price}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showWhatsApp && whatsappPhone && (
        <WhatsappButton phone={whatsappPhone} />
      )}

      {showRecommendation && (
        <RecommendationButton
          menuItems={menuItemsForAI}
          menuText={null}
          restaurantName={restaurantName}
        />
      )}
    </>
  );
}
