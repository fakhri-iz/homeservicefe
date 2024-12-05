import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookingFormData, CartItem, HomeService } from "../types/type";
import { promise, z } from "zod";
import apiClient from "../services/apiServices";
import { paymentSchema } from "../types/validationBooking";
import AccordionSection from "../components/AccordionSection";

// Define the type for the fromData
type FormData = {
  proof: File | null;
  service_ids: number[];
};

export default function PaymentPage() {
  const [formData, setFormData] = useState<FormData>({
    proof: null,
    service_ids: [],
  });

  const [serviceDetails, setServiceDetails] = useState<HomeService[]>([]);
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null);
  const [formErrors, setFormErrors] = useState<z.ZodIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);

  const TAX_RATE = 0.11;
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fetch service details and booking data
  const fetchServiceDetails = async (cartItems: CartItem[]) => {
    try {
      const fetchedDetails = await Promise.all(
        cartItems.map(async (item) => {
          const response = await apiClient.get(`/service/${item.slug}`);
          return response.data.data;
        })
      );
      setServiceDetails(fetchedDetails);
      setLoading(false);

      const serviceIds = fetchedDetails.map((service) => service.id);
      setFormData((prevData) => ({
        ...prevData,
        service_ids: serviceIds,
      }));
    } catch (error) {
      console.error("Error fetching service details: ", error);
      setError("Failed to fetch service details");
      setLoading(false);
    }
  };

  // Load cart and booking data, and fetch service
  useEffect(() => {
    const cartData = localStorage.getItem("cart");
    const savedBookingData = localStorage.getItem("bookingData");

    if (savedBookingData) {
      setBookingData(JSON.parse(savedBookingData) as BookingFormData);
    }

    if (!cartData || (cartData && JSON.parse(cartData).length === 0)) {
      navigate("/");
      return;
    }

    const caertItems = JSON.parse(cartData) as CartItem[];

    fetchServiceDetails(caertItems);
  }, [navigate]);

  // Calculate subtotal, tax, and total
  const subtotal = serviceDetails.reduce(
    (acc, service) => acc + service.price,
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // Handle file input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setFormData((prev) => ({
      ...prev,
      proof: file,
    }));
    setFileName(file ? file.name : null);
  };

  // Handle submit form to API transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = paymentSchema.safeParse(formData);

    if (!validation.success) {
      setFormErrors(validation.error.issues);
      return;
    }

    setFormErrors([]);

    const submissionData = new FormData();

    if (formData.proof) {
      submissionData.append("proof", formData.proof);
    }

    if (bookingData) {
      submissionData.append("name", bookingData.name);
      submissionData.append("email", bookingData.email);
      submissionData.append("phone", bookingData.phone);
      submissionData.append("address", bookingData.address);
      submissionData.append("city", bookingData.city);
      submissionData.append("post_code", bookingData.post_code);
      submissionData.append("started_time", bookingData.started_time);
      submissionData.append("schedule_at", bookingData.schedule_at);
    }

    formData.service_ids.forEach((id, index) => {
      submissionData.append(`service_ids[${index}]`, String(id));
    });

    try {
      setLoading(true);
      const response = await apiClient.post(
        "/booking-transaction",
        submissionData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log("Transactionresponse data:", response.data.data);

        const bookingTrxId = response.data.data.booking_trx_id;
        const email = response.data.data.email;

        if (!bookingTrxId) {
          console.error("Error: booking_trx_id is undifined");
        }
        setSuccessMessage("Payment proof uploaded successfully!");
        localStorage.removeItem("cart");
        localStorage.removeItem("bookingData");
        setFormData({ proof: null, service_ids: [] });
        setLoading(false);
        navigate(`/success-booking?trx_id=${bookingTrxId}&email=${email}`);
      } else {
        console.error("unexpected response status:", response.status);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      setLoading(false);
      setFormErrors([]);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error loading: {error}</p>;
  }

  return (
    <main className="relative min-h-screen mx-auto w-full max-w-[640px] bg-[#F4F5F7]">
      <div id="Background" className="absolute left-0 right-0 top-0">
        <img
          src="/assets/images/backgrounds/orange.png"
          alt="image"
          className="h-[280px] w-full object-cover object-bottom"
        />
      </div>
      <section
        id="NavTop"
        className={`fixed left-0 right-0 z-30 transition-all duration-300 ${
          isScrolled ? "top-[30px]" : "top-[16px]"
        }
          `}
      >
        <div className="relative mx-auto max-w-[640px] px-5">
          <div
            id="ContainerNav"
            className={`relative flex h-[68px] items-center justify-center transition-all duration-300 ${
              isScrolled
                ? "bg-white rounded-[22px] px-[16px] shadow-[0px_12px_20px_0px_#0305041C]"
                : ""
            }`}
          >
            <Link
              to={`/booking`}
              id="BackA"
              className="absolute left-0 transition-all duration-300"
            >
              <div
                id="Back"
                className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-white ${
                  isScrolled ? "border border-shujia-graylight" : ""
                }`}
              >
                <img
                  src="/assets/images/icons/back.svg"
                  alt="icon"
                  className="h-[22px] w-[22px] shrink-0"
                />
              </div>
            </Link>
            <h2
              id="Title"
              className={`font-semibold transition-all duration-300 ${
                isScrolled ? "" : "text-white"
              }`}
            >
              Booking Services
            </h2>
          </div>
        </div>
      </section>
      <section id="ProgressBar" className="relative px-5 pt-[92px]">
        <div className="flex">
          <div className="flex flex-col items-center">
            <div className="relative z-10 flex h-[25px] items-center">
              <div className="h-2 w-[60px] rounded-full bg-[#E68B6D]" />
              <div className="absolute h-2 w-[60px] rounded-full bg-white" />
              <div className="absolute right-0 top-0 translate-x-1/2">
                <div className="flex flex-col items-center gap-[6px]">
                  <div className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-white text-xs font-bold leading-[18px]">
                    1
                  </div>
                  <p className="text-xs font-semibold leading-[18px] text-white">
                    Booking
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex h-[25px] w-full items-center">
            <div className="h-2 w-full rounded-full bg-[#E68B6D]" />
            <div className="absolute h-2 w-1/2 rounded-full bg-white" />
            <div className="absolute right-1/2 top-0 translate-x-1/2">
              <div className="flex flex-col items-center gap-[6px]">
                <div className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-white text-xs font-bold leading-[18px]">
                  2
                </div>
                <p className="text-xs font-semibold leading-[18px] text-white">
                  Payment
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 flex h-[25px] w-[60px] items-center">
            <div className="h-2 w-[60px] rounded-full bg-[#E68B6D]" />
            <div className="absolute left-0 top-0 -translate-x-1/2">
              <div className="flex flex-col items-center gap-[6px]">
                <div className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#FFBFA9] text-xs font-bold leading-[18px] text-[#C2836D]">
                  3
                </div>
                <p className="text-xs font-semibold leading-[18px] text-[#FFBFA9]">
                  Delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="relative mt-[44px] flex flex-col px-5 pb-5">
        <header className="flex flex-col gap-[2px]">
          <h1 className="text-[26px] font-extrabold leading-[39px] text-white">
            Payment
          </h1>
          <p className="text-white">Dibayar dulu nanti baru dikerjain</p>
        </header>
        <div className="mt-[20px] flex flex-col gap-5">
          <section id="PaymentMethod" className="grid grid-cols-2 gap-[14px]">
            <div className="flex items-center justify-center gap-[10px] rounded-[20px] bg-shujia-black py-[14px]">
              <img
                src="/assets/images/icons/send-to-payment.svg"
                alt="icon"
                className="h-[32px] w-[32px] shrink-0"
              />
              <div>
                <h5 className="text-sm font-semibold leading-[21px] text-white">
                  Send to Bank
                </h5>
                <p className="text-sm leading-[21px] text-white">Available</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-[10px] rounded-[20px] border border-shujia-graylight bg-white py-[14px]">
              <img
                src="/assets/images/icons/credit-payment.svg"
                alt="icon"
                className="h-[32px] w-[32px] shrink-0"
              />
              <div>
                <h5 className="text-sm font-semibold leading-[21px]">
                  Credit Card
                </h5>
                <p className="text-sm leading-[21px]">Offline</p>
              </div>
            </div>
          </section>
          <AccordionSection
            title="Available Payment"
            iconSrc="/assets/images/icons/bottom-booking-form.svg"
          >
            <div id="AvailablePaymentJ" className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex h-[60px] w-[81px] items-center justify-center overflow-hidden">
                  <img
                    src="/assets/images/thumbnails/bca.png"
                    alt="image"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="flex flex-col gap-[10px]">
                  <div className="flex flex-col gap-[2px]">
                    <h4 className="text-shujia-gray">Bank Name</h4>
                    <strong className="font-semibold">Bank Central Asia</strong>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <h4 className="text-shujia-gray">Bank Number</h4>
                    <strong className="font-semibold">18209301928391</strong>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <h4 className="text-shujia-gray">Bank Account</h4>
                    <strong className="font-semibold">
                      Shujia Katharev Indonesia
                    </strong>
                  </div>
                </div>
              </div>
              <hr className="border-shujia-graylight" />
              <div className="flex gap-4">
                <div className="flex h-[60px] w-[81px] items-center justify-center overflow-hidden">
                  <img
                    src="/assets/images/thumbnails/mandiri.png"
                    alt="image"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="flex flex-col gap-[10px]">
                  <div className="flex flex-col gap-[2px]">
                    <h4 className="text-shujia-gray">Bank Name</h4>
                    <strong className="font-semibold">Bank Mandiri</strong>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <h4 className="text-shujia-gray">Bank Number</h4>
                    <strong className="font-semibold">829839192</strong>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <h4 className="text-shujia-gray">Bank Account</h4>
                    <strong className="font-semibold">
                      Shujia Katharev Indonesia
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>
          <AccordionSection
            title="Booking Details"
            iconSrc="/assets/images/icons/bottom-booking-form.svg"
          >
            <div className="flex flex-col gap-4" id="BookingDetailsJ">
              <div className="flex justify-between">
                <div className="flex items-center gap-[10px]">
                  <img
                    src="/assets/images/icons/note-payment.svg"
                    alt="icon"
                    className="h-[24px] w-[24px] shrink-0"
                  />
                  <p className="text-shujia-gray">Sub Total</p>
                </div>
                <strong className="font-semibold">
                  {formatCurrency(subtotal)}
                </strong>
              </div>
              <hr className="border-shujia-graylight" />
              <div className="flex justify-between">
                <div className="flex items-center gap-[10px]">
                  <img
                    src="/assets/images/icons/note-payment.svg"
                    alt="icon"
                    className="h-[24px] w-[24px] shrink-0"
                  />
                  <p className="text-shujia-gray">Tax 11%</p>
                </div>
                <strong className="font-semibold">{formatCurrency(tax)}</strong>
              </div>
              <hr className="border-shujia-graylight" />
              <div className="flex justify-between">
                <div className="flex items-center gap-[10px]">
                  <img
                    src="/assets/images/icons/note-payment.svg"
                    alt="icon"
                    className="h-[24px] w-[24px] shrink-0"
                  />
                  <p className="text-shujia-gray">Insurance</p>
                </div>
                <strong className="font-semibold">Free for All</strong>
              </div>
              <hr className="border-shujia-graylight" />
              <div className="flex justify-between">
                <div className="flex items-center gap-[10px]">
                  <img
                    src="/assets/images/icons/note-payment.svg"
                    alt="icon"
                    className="h-[24px] w-[24px] shrink-0"
                  />
                  <p className="text-shujia-gray">Service Tools</p>
                </div>
                <strong className="font-semibold">Free for All</strong>
              </div>
              <hr className="border-shujia-graylight" />
              <div className="flex justify-between">
                <div className="flex items-center gap-[10px]">
                  <img
                    src="/assets/images/icons/note-payment.svg"
                    alt="icon"
                    className="h-[24px] w-[24px] shrink-0"
                  />
                  <p className="text-shujia-gray">Grand Total</p>
                </div>
                <strong className="text-[20px] font-bold leading-[30px] text-shujia-orange">
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>
          </AccordionSection>
        </div>
        <form onSubmit={handleSubmit} className="mt-[20px]">
          <AccordionSection
            title="Confirmation"
            iconSrc="/assets/images/icons/bottom-booking-form.svg"
          >
            <div id="ConfirmationJ" className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <h4 className="font-semibold">Add Proof of Payment</h4>
                <div className="relative flex h-[52px] w-full items-center overflow-hidden rounded-full border border-shujia-graylight transition-all duration-300 focus-within:border-shujia-orange">
                  <img
                    src="/assets/images/icons/proof-payment.svg"
                    alt="icon"
                    className="absolute left-[14px] top-1/2 h-6 w-6 shrink-0 -translate-y-1/2"
                  />
                  <p
                    id="upload"
                    className="absolute left-12 top-1/2 -translate-y-1/2 py-[50px] text-shujia-gray"
                  >
                    {fileName ? fileName : "Upload Image"}
                  </p>
                  <input
                    onChange={handleChange}
                    type="file"
                    name="proof"
                    id="file-upload"
                    className="opacity-0 w-full pl-[50px] font-semibold file:hidden"
                  />
                </div>
              </label>
            </div>
          </AccordionSection>
          <button
            type="submit"
            className="mt-[54px] w-full rounded-full bg-shujia-orange py-[14px] font-semibold text-white transition-all duration-300 hover:shadow-[0px_4px_10px_0px_#D04B1E80]"
          >
            Confirm My Payment
          </button>
        </form>
      </div>
    </main>
  );
}
