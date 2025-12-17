"use client";

import Image from "next/image";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  LucideGlobe2,
} from "lucide-react";
import Link from "next/link";
const base_url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const Home = () => {
  return (
    <div className="min-h-screen bg-[#0E2A47] backdrop-blur supports-[backdrop-filter]:bg-[#0E2A47]/95" >
      {/* Hero Section with Background Image */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
       

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2  border border-white rounded-full p-6 mb-6 ">
            
              <Image
                src="/Logo.png"
                alt="Kings Care Medical Clinic"
                width={200}
                height={200}
                className="inline-block h-auto "
                priority
              />
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
            Your Trusted Partner in{" "}
            <span className="text-[#D9C89E]">Health & Wellness</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl md:text-3xl text-teal-50 mb-8 max-w-3xl mx-auto leading-relaxed animate-slide-up-delay">
            Modern telemedicine meets compassionate, personalized care
          </p>

          {/* Description */}
          <p className="text-lg text-white/80 mb-12 max-w-2xl mx-auto">
            Experience healthcare reimagined. From virtual consultations to prescription delivery, we are here for you every step of the way.
          </p>

          {/* CTA Buttons - Centered */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href={`${base_url}`} className="group bg-white text-teal-600 font-bold px-8 py-5 rounded-full hover:bg-teal-50 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 flex items-center gap-3 text-lg">
              <LucideGlobe2 className="w-5 h-5" />
              Main Website 
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
          
          </div>

          
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/70 rounded-full animate-scroll" />
          </div>
        </div>
      </section>

     
      {/* Custom Animations CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scroll {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(8px);
          }
          100% {
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }

        .animate-slide-up-delay {
          animation: slide-up 0.8s ease-out 0.2s both;
        }

        .animate-scroll {
          animation: scroll 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;
