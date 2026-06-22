/** @type {import('next').NextConfig} */
const dbUrl = Buffer.from('cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfQzNjd0JhT0tYdjl1QGVwLWVtcHR5LWNha2UtYXRqYnprMmgtcG9vbGVyLmMtOS51cy1lYXN0LTEuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJlJmNoYW5uZWxfYmluZGluZz1yZXF1aXJl', 'base64').toString('utf-8');
const directUrl = Buffer.from('cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfQzNjd0JhT0tYdjl1QGVwLWVtcHR5LWNha2UtYXRqYnprMmguYy05LnVzLWVhc3QtMS5hd3MubmVvbi50ZWNoL25lb25kYj9zc2xtb2RlPXJlcXVpcmUmY2hhbm5lbF9iaW5kaW5nPXJlcXVpcmU=', 'base64').toString('utf-8');

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    DATABASE_URL: dbUrl,
    DIRECT_URL: directUrl,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c291bmQtbGVvcGFyZC0yOS5jbGVyay5hY2NvdW50cy5kZXYk',
    CLERK_SECRET_KEY: 'sk_test_ALzq4X8OsRdvs8fCDB2kchzY03pTV0dI5Bc3Qoa0nt',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  }
};

export default nextConfig;
