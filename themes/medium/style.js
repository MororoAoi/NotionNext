/* eslint-disable react/no-unknown-property */
/**
 * 此处样式只对当前主题生效
 * 此处不支持tailwindCSS的 @apply 语法
 * @returns
 */
const Style = () => {
  return (
    <style jsx global>{`

    body{
     background-image: url('https://images.pexels.com/photos/3394939/pexels-photo-3394939.jpeg');
        background-size: cover; // 确保图片覆盖整个背景
    }
    // 底色
    .dark body{
        background-color: black;
    }

  `}</style>
);
}

export { Style }
