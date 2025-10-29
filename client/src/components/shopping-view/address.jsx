import { useEffect, useState } from "react";
import CommonForm from "../common/form";
import { Card } from "../ui/card";
import { addressFormControls } from "@/config";
import { useDispatch, useSelector } from "react-redux";
import {
  addNewAddress,
  deleteAddress,
  editaAddress,
  fetchAllAddresses,
} from "@/store/shop/address-slice";
import AddressCard from "./address-card";
import { useToast } from "../ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";

const initialAddressFormData = {
  address: "",
  city: "",
  phone: "",
  pincode: "",
  notes: "",
};

function Address({ setCurrentSelectedAddress, selectedId }) {
  const [formData, setFormData] = useState(initialAddressFormData);
  const [currentEditedId, setCurrentEditedId] = useState(null);

  // NEW: form modal open/close
  const [formOpen, setFormOpen] = useState(false);

  // Deletion confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { addressList } = useSelector((state) => state.shopAddress);
  const { toast } = useToast();

  // 10-digit phone validator
  const isValidPhone = (v) => /^\d{10}$/.test((v || "").trim());

  function resetForm() {
    setFormData(initialAddressFormData);
    setCurrentEditedId(null);
  }

  function openAddModal() {
    resetForm();
    setFormOpen(true);
  }

  function handleManageAddress(event) {
    event.preventDefault();

    // limit check (only for add, not edit)
    if (addressList.length >= 3 && currentEditedId === null) {
      resetForm();
      toast({ title: "You can add max 3 addresses", variant: "destructive" });
      return;
    }

    // Phone validation
    if (!isValidPhone(formData.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Phone must be a 10-digit number.",
        variant: "destructive",
      });
      return;
    }

    const afterSuccess = (msg) => {
      dispatch(fetchAllAddresses(user?.id));
      toast({ title: msg });
      resetForm();
      setFormOpen(false); // close the modal after success
    };

    if (currentEditedId !== null) {
      dispatch(
        editaAddress({
          userId: user?.id,
          addressId: currentEditedId,
          formData,
        })
      ).then((data) => {
        if (data?.payload?.success) afterSuccess("Address updated successfully");
      });
    } else {
      dispatch(
        addNewAddress({
          ...formData,
          userId: user?.id,
        })
      ).then((data) => {
        if (data?.payload?.success) afterSuccess("Address added successfully");
      });
    }
  }

  // Deletion confirm flow
  function handleDeleteAddress(getCurrentAddress) {
    setAddressToDelete(getCurrentAddress);
    setConfirmOpen(true);
  }

  function confirmDeleteAddress() {
    if (!addressToDelete) return;
    dispatch(
      deleteAddress({ userId: user?.id, addressId: addressToDelete._id })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchAllAddresses(user?.id));
        toast({ title: "Address deleted successfully" });
      } else {
        toast({ title: "Failed to delete address", variant: "destructive" });
      }
      setConfirmOpen(false);
      setAddressToDelete(null);
    });
  }

  function handleEditAddress(getCurrentAddress) {
    setCurrentEditedId(getCurrentAddress?._id);
    setFormData({
      address: getCurrentAddress?.address ?? "",
      city: getCurrentAddress?.city ?? "",
      phone: getCurrentAddress?.phone ?? "",
      pincode: getCurrentAddress?.pincode ?? "",
      notes: getCurrentAddress?.notes ?? "",
    });
    setFormOpen(true); // open modal for editing
  }

  function isFormValid() {
    const allRequiredFilled = Object.entries(formData)
      .filter(([key]) => key !== "notes")
      .every(([, val]) => String(val ?? "").trim().length > 0);
    return allRequiredFilled && isValidPhone(formData.phone);
  }

  useEffect(() => {
    if (user?.id) dispatch(fetchAllAddresses(user.id));
  }, [dispatch, user?.id]);

  return (
    <div className="sm:max-w-[25%]">
      <Card className="sm:p-4 p-2">
        {/* Top row: Title + Add button */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Saved Addresses</h3>
          <Button onClick={openAddModal}>Add address</Button>
        </div>

        {/* Address list (unchanged) */}
        <div className="gap-2 sm:block flex overflow-x-scroll">
          {addressList && addressList.length > 0
            ? addressList.map((singleAddressItem) => (
                <AddressCard
                  key={singleAddressItem._id}
                  selectedId={selectedId}
                  handleDeleteAddress={handleDeleteAddress}
                  addressInfo={singleAddressItem}
                  handleEditAddress={handleEditAddress} // opens modal in edit mode
                  setCurrentSelectedAddress={setCurrentSelectedAddress}
                />
              ))
            : null}
        </div>
      </Card>

      {/* ADD/EDIT FORM MODAL */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {currentEditedId !== null ? "Edit Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {currentEditedId !== null
                ? "Update the fields below and save your changes."
                : "Fill in your address details and click Add to save it."}
            </DialogDescription>
          </DialogHeader>

          {/* Your existing form inside the modal */}
          <CommonForm
            formControls={addressFormControls}
            formData={formData}
            setFormData={setFormData}
            buttonText={currentEditedId !== null ? "Save changes" : "Add"}
            onSubmit={handleManageAddress}
            isBtnDisabled={!isFormValid()}
          />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM MODAL (unchanged) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete this address?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected address will be
              permanently removed from your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteAddress}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Address;
