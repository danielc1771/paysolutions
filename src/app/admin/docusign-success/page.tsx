export default function DocuSignSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">
          DocuSign Authorization Successful!
        </h1>
        <p className="text-green-700 mb-6">
          Your DocuSign integration has been authorized successfully. You can now test envelope creation.
        </p>
        <a
          href="/admin/docusign-test"
          className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          Back to Test Page
        </a>
      </div>
    </div>
  );
}
