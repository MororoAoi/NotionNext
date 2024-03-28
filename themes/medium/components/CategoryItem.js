import Link from 'next/link'

export default function CategoryItem ({ selected, category, categoryCount }) {
  return (
    <Link
      href={`/category/${category}`}
      passHref
      className={(selected
        ? 'hover:text-white dark:hover:text-white bg-rose-400 text-white '
        : 'dark:text-rose-300 text-gray-500 hover:text-white dark:hover:text-white hover:bg-rose-300') +
      ' flex text-sm items-center duration-300 cursor-pointer py-1 font-light px-2 whitespace-nowrap'}>

      <div><i className={`mr-2 fas ${selected ? 'fa-folder-open' : 'fa-folder'}`} />{category} {categoryCount && `(${categoryCount})`}
      </div>

    </Link>
  );
}
