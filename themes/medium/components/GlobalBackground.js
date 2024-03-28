import React from 'react';

const GlobalBackground = () => {
  return (
    <style jsx global>{`
      body {
        background-image: url('https://images.pexels.com/photos/3394939/pexels-photo-3394939.jpeg');
        background-size: cover; /* 确保图片覆盖整个背景 */
      }
    `}</style>
  );
};

export default GlobalBackground;
