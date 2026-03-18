'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface CardCarouselItem {
  id: string;
  src: string;
  alt: string;
}

interface CardCarouselProps {
  images: CardCarouselItem[];
  onCardClick?: (id: string) => void;
  autoplay?: boolean;
}

export function CardCarousel({ images, onCardClick, autoplay = true }: CardCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
        <p className="text-gray-400 text-sm">Sem campanhas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Swiper
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        modules={[Navigation, Pagination, Autoplay]}
        grabCursor
        initialSlide={0}
        autoplay={autoplay ? { delay: 5000, disableOnInteraction: true, pauseOnMouseEnter: true } : false}
        pagination={{ clickable: true, dynamicBullets: true }}
        breakpoints={{
          0:    { slidesPerView: 1,   spaceBetween: 16 },
          640:  { slidesPerView: 2,   spaceBetween: 20 },
          1024: { slidesPerView: 3,   spaceBetween: 24 },
          1280: { slidesPerView: 3,   spaceBetween: 28 },
        }}
        className="card-carousel !pb-12"
      >
        {images.map((image) => (
          <SwiperSlide key={image.id}>
            <div
              onClick={() => onCardClick?.(image.id)}
              className="relative w-full h-[240px] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group/card"
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white font-bold text-base leading-tight line-clamp-2 drop-shadow-lg">
                  {image.alt}
                </h3>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-purple-600/0 group-hover/card:bg-purple-600/10 transition-colors duration-300 rounded-2xl" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute left-2 top-[calc(50%-24px)] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-700 hover:bg-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute right-2 top-[calc(50%-24px)] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-700 hover:bg-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Custom styles for pagination bullets */}
      <style jsx global>{`
        .card-carousel .swiper-pagination-bullet {
          background: #a855f7;
          opacity: 0.3;
          width: 8px;
          height: 8px;
          transition: all 0.3s ease;
        }
        .card-carousel .swiper-pagination-bullet-active {
          opacity: 1;
          width: 24px;
          border-radius: 4px;
          background: linear-gradient(to right, #a855f7, #ec4899);
        }
      `}</style>
    </div>
  );
}
