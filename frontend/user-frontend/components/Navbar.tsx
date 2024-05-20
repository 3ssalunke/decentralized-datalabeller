export default function Navbar() {
  return (
    <div className="w-full h-14 border-blue-50 border-b-2">
      <div className="flex justify-between items-center p-2">
        <h2 className="font-bold text-2xl">decentDLB</h2>
        <button className="px-4 py-2 bg-blue-50 text-black font-semibold rounded-md">
          Connect Wallet
        </button>
      </div>
    </div>
  );
}
