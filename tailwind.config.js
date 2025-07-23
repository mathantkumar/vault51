module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [
    'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500',
    'bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50',
    'border-blue-400', 'border-green-400', 'border-purple-400', 'border-orange-400',
    'text-blue-700', 'text-green-700', 'text-purple-700', 'text-orange-700',
    'hover:bg-blue-700', 'hover:bg-green-700', 'hover:bg-purple-700', 'hover:bg-orange-600',
    'hover:bg-blue-100', 'hover:bg-green-100', 'hover:bg-purple-100', 'hover:bg-orange-100',
    'hover:text-white',
    'focus:ring-blue-200', 'focus:ring-green-200', 'focus:ring-purple-200', 'focus:ring-orange-200',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}; 