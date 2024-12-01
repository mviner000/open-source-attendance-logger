export const GJ7Logo = () => {
    return (
      <svg
        viewBox="0 0 520 200"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* G letter with hole */}
        <path
          d="M60 20C60 8.954 68.954 0 80 0H160C171.046 0 180 8.954 180 20V60H120V90H180V160C180 171.046 171.046 180 160 180H80C68.954 180 60 171.046 60 160V20Z"
          className="fill-[#FFB800]"
        />
        <path
          d="M60 110V160H160C171.046 160 180 151.046 180 140V110H120Z"
          className="fill-white"
        />
        
        {/* J letter with white and black outlines */}
        <path
          d="M230 40V120C230 144.853 209.853 165 185 165"
          className="stroke-white stroke-[40] stroke-linecap-round fill-none"
        />
        <path
          d="M230 40V120C230 144.853 209.853 165 185 165"
          className="stroke-black stroke-[32] stroke-linecap-round fill-none"
        />
        <path
          d="M230 40V120C230 144.853 209.853 165 185 165"
          className="stroke-[#FFB800] stroke-[32] stroke-linecap-round"
        />
        
        {/* 7 with white and black outlines - moved right */}
        <path
          d="M215 40H325L260 160"
          className="stroke-white stroke-[40] stroke-linecap-round stroke-linejoin-round fill-none"
        />
        <path
          d="M215 40H325L260 160"
          className="stroke-black stroke-[32] stroke-linecap-round stroke-linejoin-round fill-none"
        />
        <path
          d="M215 40H325L260 160"
          className="stroke-[#FFB800] stroke-[32] stroke-linecap-round stroke-linejoin-round"
        />
        
        {/* G letter outlines */}
        <path
          d="M60 20C60 8.954 68.954 0 80 0H160C171.046 0 180 8.954 180 20V60H120V90H180V160C180 171.046 171.046 180 160 180H80C68.954 180 60 171.046 60 160V20Z"
          className="stroke-white stroke-[4] fill-none"
        />
        <path
          d="M60 110V160H160C171.046 160 180 151.046 180 140V110H120Z"
          className="stroke-green-800 stroke-[5] fill-none"
        />
      </svg>
    )
  }